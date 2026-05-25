import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface GuardsOrderReceivedProps {
  firstName?: string
  referenceNumber?: string
}

const GuardsOrderReceivedEmail = ({ firstName, referenceNumber }: GuardsOrderReceivedProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>We've received your guards order</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{firstName ? `Hi ${firstName},` : 'Hi,'}</Heading>
        <Text style={text}>Thank you for ordering your guards with Gaonhae Taekwondo.</Text>
        <Text style={text}>We will update you when your guards are ready for collection.</Text>
        {referenceNumber && (
          <Text style={text}><strong>Reference:</strong> {referenceNumber}</Text>
        )}
        <Text style={footer}>Thank you<br />Gaonhae Taekwondo</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: GuardsOrderReceivedEmail,
  subject: "We've received your guards order",
  displayName: 'Guards order received',
  previewData: { firstName: 'JANE', referenceNumber: 'GP-2026-0001' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '600px' }
const h1 = { fontSize: '20px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#334155', lineHeight: '1.6', margin: '0 0 12px' }
const footer = { fontSize: '12px', color: '#64748b', margin: '20px 0 0' }
