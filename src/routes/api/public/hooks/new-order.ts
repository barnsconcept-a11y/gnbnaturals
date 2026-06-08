import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'
import * as React from 'react'
import { render as renderAsync } from '@react-email/components'
import { TEMPLATES } from '@/lib/email-templates/registry'

const SITE_NAME = 'gnbnaturals'
const SENDER_DOMAIN = 'notify.gnbnaturals.com'
const FROM_DOMAIN = 'gnbnaturals.com'

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

          // Collect recipients
          const recipients = new Set<string>()

          // 1. All super-admins
          const { data: adminRoles } = await admin
            .from('user_roles')
            .select('user_id')
            .eq('role', 'admin')
          for (const r of adminRoles ?? []) {
            const { data: u } = await admin.auth.admin.getUserById(r.user_id)
            const email = u?.user?.email
            if (email) recipients.add(email.toLowerCase())
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
              if (email) recipients.add(email.toLowerCase())
            }
          }

          // 3. Optional extra address from app_settings
          const { data: setting } = await admin
            .from('app_settings')
            .select('value')
            .eq('key', 'admin_notification_email')
            .maybeSingle()
          const extra = setting?.value?.trim()
          if (extra) recipients.add(extra.toLowerCase())

          if (recipients.size === 0) {
            return Response.json({ skipped: 'no recipients found' })
          }

          const template = TEMPLATES['new-order']
          if (!template) {
            return Response.json({ error: 'template missing' }, { status: 500 })
          }

          const templateData = {
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
          }

          const element = React.createElement(template.component, templateData)
          const html = await renderAsync(element)
          const text = await renderAsync(element, { plainText: true })
          const subject =
            typeof template.subject === 'function'
              ? template.subject(templateData)
              : template.subject

          const results: { to: string; ok: boolean; error?: string }[] = []
          for (const to of recipients) {
            const messageId = crypto.randomUUID()
            await admin.from('email_send_log').insert({
              message_id: messageId,
              template_name: 'new-order',
              recipient_email: to,
              status: 'pending',
            })

            const { error: enqueueError } = await admin.rpc('enqueue_email', {
              queue_name: 'transactional_emails',
              payload: {
                message_id: messageId,
                to,
                from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
                sender_domain: SENDER_DOMAIN,
                subject,
                html,
                text,
                purpose: 'transactional',
                label: 'new-order',
                idempotency_key: `new-order-${order.id}-${to}`,
                queued_at: new Date().toISOString(),
              },
            })
            results.push({ to, ok: !enqueueError, error: enqueueError?.message })
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
