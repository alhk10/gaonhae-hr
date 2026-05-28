import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Hr, Html, Preview, Row, Column, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface GuardsOrderItem {
  label: string
  qty: number
  unit_price_inc: number
}

interface GuardsOrderReceivedProps {
  firstName?: string
  fullName?: string
  referenceNumber?: string
  items?: GuardsOrderItem[]
  subtotal?: number
  gst_amount?: number
  total?: number
}

const fmt = (n: number) => `$${(Number(n) || 0).toFixed(2)}`

const GuardsOrderReceivedEmail = ({
  firstName,
  fullName,
  referenceNumber,
  items = [],
  subtotal,
  gst_amount,
  total,
}: GuardsOrderReceivedProps) => {
  const computedTotal = typeof total === 'number'
    ? total
    : items.reduce((s, it) => s + (Number(it.unit_price_inc) || 0) * (Number(it.qty) || 0), 0)

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Your protection guard order has been received</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{firstName ? `Hi ${firstName},` : 'Hi,'}</Heading>
          <Text style={text}>
            Thank you for your protection guard order. Your order are as follows:
          </Text>

          {referenceNumber && (
            <Text style={refText}><strong>Reference:</strong> {referenceNumber}</Text>
          )}

          <Section style={tableWrap}>
            <Row style={headerRow}>
              <Column style={{ ...thCell, width: '60%' }}>Item</Column>
              <Column style={{ ...thCell, width: '12%', textAlign: 'center' }}>Qty</Column>
              <Column style={{ ...thCell, width: '28%', textAlign: 'right' }}>Amount</Column>
            </Row>
            {items.map((it, idx) => (
              <Row key={idx} style={bodyRow}>
                <Column style={{ ...tdCell, width: '60%' }}>{it.label}</Column>
                <Column style={{ ...tdCell, width: '12%', textAlign: 'center' }}>{it.qty}</Column>
                <Column style={{ ...tdCell, width: '28%', textAlign: 'right' }}>
                  {fmt((Number(it.unit_price_inc) || 0) * (Number(it.qty) || 0))}
                </Column>
              </Row>
            ))}

            <Hr style={hr} />

            {typeof subtotal === 'number' && (
              <Row>
                <Column style={{ ...totalLabel, width: '72%' }}>Subtotal</Column>
                <Column style={{ ...totalValue, width: '28%' }}>{fmt(subtotal)}</Column>
              </Row>
            )}
            {typeof gst_amount === 'number' && gst_amount > 0 && (
              <Row>
                <Column style={{ ...totalLabel, width: '72%' }}>GST (9%)</Column>
                <Column style={{ ...totalValue, width: '28%' }}>{fmt(gst_amount)}</Column>
              </Row>
            )}
            <Row>
              <Column style={{ ...totalLabel, width: '72%', fontWeight: 'bold' }}>Total</Column>
              <Column style={{ ...totalValue, width: '28%', fontWeight: 'bold' }}>{fmt(computedTotal)}</Column>
            </Row>
          </Section>

          <Text style={text}>We will update you when your guards are ready for collection.</Text>
          <Text style={text}>Should you have any further questions, please check with your masters.</Text>
          <Text style={muted}>Please do not reply to this email.</Text>
          <Text style={footer}>Thank you<br />Gaonhae Taekwondo</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: GuardsOrderReceivedEmail,
  subject: (data: Record<string, any>) => {
    const name = (data?.fullName || data?.firstName || '').toString().trim()
    return name ? `${name} Protection Guard Order` : 'Your Protection Guard Order'
  },
  displayName: 'Guards order received',
  previewData: {
    firstName: 'JANE',
    fullName: 'JANE DOE',
    referenceNumber: 'GP-2026-0001',
    items: [
      { label: 'Gaonhae Protection Guard Set', qty: 1, unit_price_inc: 174.40 },
    ],
    subtotal: 160.00,
    gst_amount: 14.40,
    total: 174.40,
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '600px' }
const h1 = { fontSize: '20px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#334155', lineHeight: '1.6', margin: '0 0 12px' }
const refText = { fontSize: '13px', color: '#334155', margin: '0 0 12px' }
const muted = { fontSize: '12px', color: '#64748b', margin: '16px 0 0', fontStyle: 'italic' }
const footer = { fontSize: '13px', color: '#334155', margin: '20px 0 0' }
const tableWrap = { margin: '12px 0 16px' }
const headerRow = { borderBottom: '1px solid #e2e8f0' }
const bodyRow = { borderBottom: '1px solid #f1f5f9' }
const thCell = { fontSize: '12px', color: '#64748b', padding: '8px 4px', fontWeight: 'bold' as const }
const tdCell = { fontSize: '13px', color: '#0f172a', padding: '8px 4px' }
const hr = { borderColor: '#e2e8f0', margin: '8px 0' }
const totalLabel = { fontSize: '13px', color: '#0f172a', padding: '4px 4px', textAlign: 'right' as const }
const totalValue = { fontSize: '13px', color: '#0f172a', padding: '4px 4px', textAlign: 'right' as const }
