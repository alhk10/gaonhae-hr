import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface CompetitionConfirmationProps {
  firstName?: string
  fullName?: string
  competitionName?: string
  coachingName?: string
  categories?: string[]
  amount?: number
  referenceNumber?: string
}

const CompetitionConfirmationEmail = ({
  firstName,
  fullName,
  competitionName = '',
  coachingName = '',
  categories = [],
  amount,
  referenceNumber = '',
}: CompetitionConfirmationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{fullName || 'Your'} Competition Registration</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Competition Registration Confirmation</Heading>
        <Text style={text}>Hi {firstName || 'there'},</Text>
        <Text style={text}>
          Thank you for your Competition Registration. The details are as follows:
        </Text>

        <Section style={detailsBox}>
          {competitionName && (
            <Text style={detailRow}><strong>Competition:</strong> {competitionName}</Text>
          )}
          {coachingName && (
            <Text style={detailRow}><strong>Coaching:</strong> {coachingName}</Text>
          )}
          {categories.length > 0 && (
            <Text style={detailRow}>
              <strong>Categor{categories.length > 1 ? 'ies' : 'y'}:</strong>{' '}
              {categories.join(', ')}
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
  component: CompetitionConfirmationEmail,
  subject: (data: Record<string, any>) => {
    const name = data?.fullName || 'Your'
    const comp = data?.competitionName ? ` ${data.competitionName}` : ' Competition Registration'
    return `${name}${comp}`
  },
  displayName: 'Competition confirmation',
  previewData: {
    firstName: 'JANE',
    fullName: 'JANE TAN',
    competitionName: 'Singapore Open 2026',
    coachingName: 'Singapore Open 2026 Coaching',
    categories: ['Poomsae Individual', 'Kyorugi'],
    amount: 150.0,
    referenceNumber: 'COMP-2026-0001',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '600px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#334155', lineHeight: '1.5', margin: '0 0 12px' }
const detailsBox = { backgroundColor: '#f8fafc', padding: '12px 16px', borderRadius: '6px', margin: '12px 0' }
const detailRow = { fontSize: '14px', color: '#0f172a', margin: '4px 0' }
const footer = { fontSize: '12px', color: '#64748b', margin: '8px 0 0' }
