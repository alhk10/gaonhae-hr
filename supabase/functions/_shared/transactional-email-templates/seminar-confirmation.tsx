import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface SeminarConfirmationProps {
  firstName?: string
  fullName?: string
  packageLabel?: string
  sessionDates?: string[]
  amount?: number
  referenceNumber?: string
}

const formatDDMMYYYY = (iso: string): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso
}

const SeminarConfirmationEmail = ({
  firstName,
  fullName,
  packageLabel = '',
  sessionDates = [],
  amount,
  referenceNumber = '',
}: SeminarConfirmationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{fullName || 'Your'} Seminar Registration</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Seminar Registration Confirmation</Heading>
        <Text style={text}>Hi {firstName || 'there'},</Text>
        <Text style={text}>
          Thank you for your Seminar Registration. The details are as follows:
        </Text>

        <Section style={detailsBox}>
          {packageLabel && (
            <Text style={detailRow}><strong>Seminar:</strong> {packageLabel}</Text>
          )}
          {sessionDates.length > 0 && (
            <Text style={detailRow}>
              <strong>Session Date{sessionDates.length > 1 ? 's' : ''}:</strong>{' '}
              {sessionDates.map(formatDDMMYYYY).join(', ')}
            </Text>
          )}
          {typeof amount === 'number' && (
            <Text style={detailRow}><strong>Amount:</strong> ${amount.toFixed(2)}</Text>
          )}
          {referenceNumber && (
            <Text style={detailRow}><strong>Reference Number:</strong> {referenceNumber}</Text>
          )}
        </Section>

        <Text style={text}>
          Should you have any further questions, please check with your masters.
        </Text>
        <Text style={footer}>Please do not reply to this email.</Text>
        <Text style={footer}>Thank you<br />Gaonhae Taekwondo</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SeminarConfirmationEmail,
  subject: (data: Record<string, any>) =>
    `${data?.fullName || 'Your'} Seminar`,
  displayName: 'Seminar confirmation',
  previewData: {
    firstName: 'JANE',
    fullName: 'JANE TAN',
    packageLabel: 'Sat, 13 Jun 2026 · 4:00 PM · Bukit Merah Branch',
    sessionDates: ['2026-06-13'],
    amount: 81.75,
    referenceNumber: 'SEM-2026-0001',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '600px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#334155', lineHeight: '1.5', margin: '0 0 12px' }
const detailsBox = { backgroundColor: '#f8fafc', padding: '12px 16px', borderRadius: '6px', margin: '12px 0' }
const detailRow = { fontSize: '14px', color: '#0f172a', margin: '4px 0' }
const footer = { fontSize: '12px', color: '#64748b', margin: '8px 0 0' }
