import React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface OrderItem {
  stack?: string
  variant?: string
  unit_price?: number
  qty?: number
}

interface Props {
  orderId: string
  customerName: string
  customerPhone?: string | null
  customerEmail?: string | null
  pickupStation: string
  pickupDate?: string | null
  totalAmount: number
  totalCrates: number
  currency?: string
  notes?: string | null
  items: OrderItem[]
  siteUrl?: string
}

const OrderConfirmationEmail = ({
  orderId,
  customerName,
  customerPhone,
  customerEmail,
  pickupStation,
  pickupDate,
  totalAmount,
  totalCrates,
  currency = 'GHS',
  notes,
  items,
  siteUrl,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      Your order has been confirmed — {currency} {totalAmount.toFixed(2)}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Thank you, {customerName}!</Heading>
        <Text style={muted}>Order #{orderId.slice(0, 8)}</Text>

        <Text style={lead}>We have received your order and it is being prepared.</Text>

        <Section style={card}>
          <Text style={label}>Pickup station</Text>
          <Text style={value}>{pickupStation}</Text>
        </Section>

        {pickupDate ? (
          <Section style={card}>
            <Text style={label}>Expected pickup</Text>
            <Text style={value}>{pickupDate}</Text>
            <Text style={muted}>
              Pickup runs twice a week (Tuesdays and Thursdays). Your order will be ready for the next available pickup.
            </Text>
          </Section>
        ) : null}

        <Section style={card}>
          <Text style={label}>Items</Text>
          {items.map((it, i) => (
            <Text key={i} style={value}>
              {it.qty}× {it.stack}
              {it.variant ? ` (${it.variant})` : ''} — {currency}{' '}
              {((it.unit_price ?? 0) * (it.qty ?? 0)).toFixed(2)}
            </Text>
          ))}
          <Hr style={hr} />
          <Text style={value}>
            <strong>
              Total: {currency} {totalAmount.toFixed(2)} ({totalCrates} crate
              {totalCrates === 1 ? '' : 's'})
            </strong>
          </Text>
        </Section>

        {notes ? (
          <Section style={card}>
            <Text style={label}>Notes</Text>
            <Text style={value}>{notes}</Text>
          </Section>
        ) : null}

        <Text style={muted}>
          Need help? Reply to this email or contact us through{' '}
          {siteUrl ? <a href={siteUrl}>{siteUrl}</a> : 'our website'}.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: OrderConfirmationEmail,
  subject: (data: Record<string, any>) =>
    `Your order is confirmed — ${data.currency ?? 'GHS'} ${Number(
      data.totalAmount ?? 0,
    ).toFixed(2)}`,
  displayName: 'Order confirmation (customer)',
  previewData: {
    orderId: 'abcdef12-3456-7890',
    customerName: 'Jane Doe',
    customerPhone: '+233500000000',
    customerEmail: 'jane@example.com',
    pickupStation: 'East Legon Gym',
    pickupDate: 'Tuesday, 7 Jul',
    totalAmount: 240,
    totalCrates: 2,
    currency: 'GHS',
    notes: 'Please call before pickup',
    items: [
      { stack: 'Hydration Stack', variant: 'Classic', unit_price: 120, qty: 2 },
    ],
    siteUrl: 'https://gnbnaturals.com',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', color: '#111', margin: '0 0 4px' }
const lead = { fontSize: '16px', color: '#333', margin: '0 0 16px' }
const muted = { color: '#666', fontSize: '13px', margin: '0 0 16px' }
const card = {
  border: '1px solid #eee',
  borderRadius: '8px',
  padding: '14px 16px',
  margin: '0 0 12px',
}
const label = {
  fontSize: '11px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.06em',
  color: '#888',
  margin: '0 0 4px',
}
const value = { fontSize: '15px', color: '#111', margin: '2px 0' }
const hr = { borderColor: '#eee', margin: '10px 0' }
