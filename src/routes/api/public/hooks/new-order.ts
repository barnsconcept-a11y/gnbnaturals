import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'
import * as React from 'react'
import { render as renderAsync } from '@react-email/components'
import { TEMPLATES } from '@/lib/email-templates/registry'
import { expectedPickupLabel } from '@/lib/delivery'

const SITE_NAME = 'gnbnaturals'
const SENDER_DOMAIN = 'notify.gnbnaturals.com'
const FROM_DOMAIN = 'gnbnaturals.com'

interface SendJob {
  to: string
  templateName: 'new-order' | 'order-confirmation'
  templateData: Record<string, any>
}

export const Route = createFileRoute('/api/public/hooks/new-order')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as { orderId?: string }
          const orderId = body.orderId
          if (!orderId || typeof orderId !== 'string') {
            return Response.json({ error: 'orderId required' }, { status: 400 })
          }

          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
          const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
          if (!supabaseUrl || !serviceKey) {
            return Response.json({ error: 'server misconfigured' }, { status: 500 })
          }

          const admin = createClient(supabaseUrl, serviceKey)

          const { data: order, error: orderErr } = await admin
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .maybeSingle()
          if (orderErr || !order) {
            return Response.json({ error: 'order not found' }, { status: 404 })
          }

          // Dedup guard: if we've already enqueued notifications for this order, skip.
          // Prevents unauthenticated repeated calls from spamming admins/gym owners.
          const { data: existingLog } = await admin
            .from('email_send_log')
            .select('id')
            .in('template_name', ['new-order', 'order-confirmation'])
            .contains('metadata', { order_id: orderId })
            .limit(1)
          if (existingLog && existingLog.length > 0) {
            return Response.json({ skipped: 'already notified for this order' })
          }

          const pickupDate = expectedPickupLabel(order.created_at)

          // Build admin notification jobs
          const jobs: SendJob[] = []

          // 1. All super-admins
          const { data: adminRoles } = await admin
            .from('user_roles')
            .select('user_id')
            .eq('role', 'admin')
          for (const r of adminRoles ?? []) {
            const { data: u } = await admin.auth.admin.getUserById(r.user_id)
            const email = u?.user?.email
            if (email) {
              jobs.push({
                to: email.toLowerCase(),
                templateName: 'new-order',
                templateData: {
                  orderId: order.id,
                  customerName: order.customer_name,
                  customerPhone: order.customer_phone,
                  customerEmail: order.customer_email,
                  pickupStation: order.pickup_station,
                  totalAmount: Number(order.total_amount ?? 0),
                  totalCrates: Number(order.total_crates ?? 0),
                  currency: order.currency ?? 'GHS',
                  notes: order.notes,
                  items: order.items ?? [],
                  trackUrl: `https://gnbnaturals.com/admin`,
                },
              })
            }
          }

          // 2. Gym owners of the selected pickup gym
          const { data: gym } = await admin
            .from('gyms')
            .select('id')
            .eq('name', order.pickup_station)
            .maybeSingle()
          if (gym?.id) {
            const { data: owners } = await admin
              .from('gym_owners')
              .select('user_id')
              .eq('gym_id', gym.id)
            for (const o of owners ?? []) {
              const { data: u } = await admin.auth.admin.getUserById(o.user_id)
              const email = u?.user?.email
              if (email) {
                jobs.push({
                  to: email.toLowerCase(),
                  templateName: 'new-order',
                  templateData: {
                    orderId: order.id,
                    customerName: order.customer_name,
                    customerPhone: order.customer_phone,
                    customerEmail: order.customer_email,
                    pickupStation: order.pickup_station,
                    totalAmount: Number(order.total_amount ?? 0),
                    totalCrates: Number(order.total_crates ?? 0),
                    currency: order.currency ?? 'GHS',
                    notes: order.notes,
                    items: order.items ?? [],
                    trackUrl: `https://gnbnaturals.com/admin`,
                  },
                })
              }
            }
          }

          // 3. Optional extra address from app_settings
          const { data: setting } = await admin
            .from('app_settings')
            .select('value')
            .eq('key', 'admin_notification_email')
            .maybeSingle()
          const extra = setting?.value?.trim()
          if (extra) {
            jobs.push({
              to: extra.toLowerCase(),
              templateName: 'new-order',
              templateData: {
                orderId: order.id,
                customerName: order.customer_name,
                customerPhone: order.customer_phone,
                customerEmail: order.customer_email,
                pickupStation: order.pickup_station,
                totalAmount: Number(order.total_amount ?? 0),
                totalCrates: Number(order.total_crates ?? 0),
                currency: order.currency ?? 'GHS',
                notes: order.notes,
                items: order.items ?? [],
                trackUrl: `https://gnbnaturals.com/admin`,
              },
            })
          }

          // 4. Customer confirmation email
          const customerEmail = order.customer_email?.trim()
          if (customerEmail) {
            jobs.push({
              to: customerEmail.toLowerCase(),
              templateName: 'order-confirmation',
              templateData: {
                orderId: order.id,
                customerName: order.customer_name,
                customerPhone: order.customer_phone,
                customerEmail: order.customer_email,
                pickupStation: order.pickup_station,
                pickupDate,
                totalAmount: Number(order.total_amount ?? 0),
                totalCrates: Number(order.total_crates ?? 0),
                currency: order.currency ?? 'GHS',
                notes: order.notes,
                items: order.items ?? [],
                siteUrl: 'https://gnbnaturals.com',
              },
            })
          }

          if (jobs.length === 0) {
            return Response.json({ skipped: 'no recipients found' })
          }

          const generateToken = () => {
            const bytes = new Uint8Array(32)
            crypto.getRandomValues(bytes)
            return Array.from(bytes)
              .map((b) => b.toString(16).padStart(2, '0'))
              .join('')
          }

          const results: { to: string; template: string; ok: boolean; error?: string }[] = []
          for (const job of jobs) {
            const template = TEMPLATES[job.templateName]
            if (!template) {
              results.push({
                to: job.to,
                template: job.templateName,
                ok: false,
                error: 'template missing',
              })
              continue
            }

            // Skip suppressed
            const { data: suppressed } = await admin
              .from('suppressed_emails')
              .select('id')
              .eq('email', job.to)
              .maybeSingle()
            if (suppressed) {
              results.push({
                to: job.to,
                template: job.templateName,
                ok: false,
                error: 'suppressed',
              })
              continue
            }

            const element = React.createElement(template.component, job.templateData)
            const html = await renderAsync(element)
            const text = await renderAsync(element, { plainText: true })
            const subject =
              typeof template.subject === 'function'
                ? template.subject(job.templateData)
                : template.subject

            // Get or create unsubscribe token
            let unsubscribeToken: string
            const { data: existing } = await admin
              .from('email_unsubscribe_tokens')
              .select('token, used_at')
              .eq('email', job.to)
              .maybeSingle()
            if (existing && !existing.used_at) {
              unsubscribeToken = existing.token
            } else {
              unsubscribeToken = generateToken()
              await admin
                .from('email_unsubscribe_tokens')
                .upsert({ token: unsubscribeToken, email: job.to }, { onConflict: 'email', ignoreDuplicates: true })
              const { data: stored } = await admin
                .from('email_unsubscribe_tokens')
                .select('token')
                .eq('email', job.to)
                .maybeSingle()
              if (stored?.token) unsubscribeToken = stored.token
            }

            const messageId = crypto.randomUUID()
            await admin.from('email_send_log').insert({
              message_id: messageId,
              template_name: job.templateName,
              recipient_email: job.to,
              status: 'pending',
              metadata: { order_id: order.id },
            })

            const { error: enqueueError } = await admin.rpc('enqueue_email', {
              queue_name: 'transactional_emails',
              payload: {
                message_id: messageId,
                to: job.to,
                from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
                sender_domain: SENDER_DOMAIN,
                subject,
                html,
                text,
                purpose: 'transactional',
                label: job.templateName,
                idempotency_key: `${job.templateName}-${order.id}-${job.to}`,
                unsubscribe_token: unsubscribeToken,
                queued_at: new Date().toISOString(),
              },
            })
            results.push({
              to: job.to,
              template: job.templateName,
              ok: !enqueueError,
              error: enqueueError?.message,
            })
          }

          return Response.json({ success: true, recipients: results })
        } catch (err) {
          console.error('new-order hook error', err)
          return Response.json({ error: 'internal error' }, { status: 500 })
        }
      },
    },
  },
})
