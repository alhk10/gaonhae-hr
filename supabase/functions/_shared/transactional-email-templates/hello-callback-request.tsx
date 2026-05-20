import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface HelloCallbackProps {
  firstName?: string
  lastName?: string
  dateOfBirth?: string
  branchName?: string
  phone?: string
  email?: string
  message?: string
  submittedAt?: string
}

const HelloCallbackEmail = ({
  firstName = '',
  lastName = '',
  dateOfBirth = '',
  branchName = '',
  phone = '',
  email = '',
  message = '',
  submittedAt = '',
}: HelloCallbackProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New callback request from {firstName} {lastName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>New Callback Request</Heading>
        <Text style={text}>
          A visitor on the /hello page tapped "Not what I'm looking for" and left this message:
        </Text>

        <Section style={messageBox}>
          <Text style={messageText}>{message || '(no message provided)'}</Text>
        </Section>

        <Hr style={hr} />

        <Heading as="h2" style={h2}>Contact Details</Heading>
        <Section style={detailsBox}>
          <Text style={detailRow}><strong>Name:</strong> {`${firstName} ${lastName}`.trim() || '—'}</Text>
          {dateOfBirth && <Text style={detailRow}><strong>Date of Birth:</strong> {dateOfBirth}</Text>}
          {branchName && <Text style={detailRow}><strong>Branch:</strong> {branchName}</Text>}
          {phone && <Text style={detailRow}><strong>Phone:</strong> {phone}</Text>}
          {email && <Text style={detailRow}><strong>Email:</strong> {email}</Text>}
          {submittedAt && <Text style={detailRow}><strong>Submitted:</strong> {submittedAt}</Text>}
        </Section>

        <Text style={footer}>Gaonhae Taekwondo — /hello chat</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: HelloCallbackEmail,
  subject: (d: Record<string, any>) =>
    `New callback request from ${[d.firstName, d.lastName].filter(Boolean).join(' ') || 'a visitor'}`,
  displayName: 'Hello chat callback request',
  to: 'hello@gaonhaetaekwondo.com',
  previewData: {
    firstName: 'Jane',
    lastName: 'Doe',
    dateOfBirth: '2010-05-12',
    branchName: 'Tampines',
    phone: '+65 9123 4567',
    email: 'jane@example.com',
    message: 'I would like to know about your weekend classes.',
    submittedAt: '20/05/2026 14:30',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px', maxWidth: '600px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#000000', margin: '0 0 16px' }
const h2 = { fontSize: '16px', fontWeight: 'bold', color: '#000000', margin: '16px 0 8px' }
const text = { fontSize: '14px', color: '#444', lineHeight: '1.5', margin: '0 0 16px' }
const messageBox = { backgroundColor: '#f5f7fb', padding: '14px 16px', borderRadius: '6px', borderLeft: '4px solid #4f46e5' }
const messageText = { fontSize: '14px', color: '#1f2937', lineHeight: '1.6', margin: 0, whiteSpace: 'pre-wrap' as const }
const detailsBox = { backgroundColor: '#fafafa', padding: '12px 16px', borderRadius: '6px' }
const detailRow = { fontSize: '13px', color: '#374151', margin: '4px 0' }
const hr = { borderColor: '#e5e7eb', margin: '20px 0' }
const footer = { fontSize: '12px', color: '#999999', margin: '24px 0 0', textAlign: 'center' as const }
