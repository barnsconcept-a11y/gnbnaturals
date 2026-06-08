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
  customerPhone: string
  customerEmail?: string | null
  pickupStation: string
  totalAmount: number
  totalCrates: number
  currency?: string
  notes?: string | null
  items: OrderItem[]
  trackUrl?: string
}

const NewOrderEmail = ({
  orderId,
  customerName,
  customerPhone,
  customerEmail,
  pickupStation,
  totalAmount,
  totalCrates,
  currency = 'GHS',
  notes,
  items,
  trackUrl,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      New order from {customerName} — {currency} {totalAmount.toFixed(2)}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>New order received</Heading>
        <Text style={muted}>Order #{orderId.slice(0, 8)}</Text>

        <Section style={card}>
          <Text style={label}>Customer</Text>
          <Text style={value}>{customerName}</Text>
          <Text style={value}>{customerPhone}</Text>
          {customerEmail ? <Text style={value}>{customerEmail}</Text> : null}
        </Section>

        <Section style={card}>
          <Text style={label}>Pickup station</Text>
          <Text style={value}>{pickupStation}</Text>
        </Section>

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

        {trackUrl ? (
          <Text style={muted}>
            Manage in admin: <a href={trackUrl}>{trackUrl}</a>
          </Text>
        ) : null}
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: NewOrderEmail,
  subject: (data: Record<string, any>) =>
    `New order — ${data.customerName ?? 'customer'} (${data.currency ?? 'GHS'} ${Number(
      data.totalAmount ?? 0,
    ).toFixed(2)})`,
  displayName: 'New order notification (admin)',
  previewData: {
    orderId: 'abcdef12-3456-7890',
    customerName: 'Jane Doe',
    customerPhone: '+233500000000',
    customerEmail: 'jane@example.com',
    pickupStation: 'East Legon Gym',
    totalAmount: 240,
    totalCrates: 2,
    currency: 'GHS',
    notes: 'Please call before pickup',
    items: [
      { stack: 'Hydration Stack', variant: 'Classic', unit_price: 120, qty: 2 },
    ],
    trackUrl: 'https://gnbnaturals.com/admin',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', color: '#111', margin: '0 0 4px' }
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
