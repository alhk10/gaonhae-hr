import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface GradingConfirmationProps {
  studentName?: string
  products?: string[]
  dateTime?: string
  branchName?: string
  branchAddress?: string
}

const GradingConfirmationEmail = ({
  studentName = 'Student',
  products = [],
  dateTime = '',
  branchName = '',
  branchAddress = '',
}: GradingConfirmationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{studentName} Grading Test details</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Grading Test Confirmation</Heading>
        <Text style={text}>
          Thank you for registering for the upcoming grading test. Your grading details are as follow:
        </Text>

        <Section style={detailsBox}>
          {products.length > 0 && (
            <Text style={detailRow}><strong>Grading:</strong> {products.join(', ')}</Text>
          )}
          {dateTime && <Text style={detailRow}><strong>Date/Time:</strong> {dateTime}</Text>}
          {branchName && <Text style={detailRow}><strong>Branch:</strong> {branchName}</Text>}
          {branchAddress && <Text style={detailRow}><strong>Address:</strong> {branchAddress}</Text>}
        </Section>

        <Text style={text}>
          Please be at the grading venue punctually. You may be refused grading if you are late.
        </Text>

        <Hr style={hr} />

        <Heading as="h2" style={h2}>Grading Attire</Heading>
        <Text style={text}>White Uniform with White, Poom or Dan Collar</Text>
        <ul style={list}>
          <li style={listItem}>No under shirt or t-shirt under uniform for Male.</li>
          <li style={listItem}>Plain white t-shirt under the uniform for Female.</li>
          <li style={listItem}>Ensure Uniform is clean and pressed.</li>
          <li style={listItem}>Ensure nails are trimmed.</li>
          <li style={listItem}>No accessories e.g. Watch, bracelets, necklace, earrings. Only ear studs are allowed.</li>
          <li style={listItem}>Green belt and above please wear your Arm, Shin and Groin Guards before arriving.</li>
          <li style={listItem}>Blue belt and above please wear your Arm, Shin, Groin, Headgear and Chest guards before arriving.</li>
        </ul>

        <Hr style={hr} />

        <Text style={text}>Should you have any further questions, please check with your masters.</Text>
        <Text style={footer}>Please do not reply to this email.</Text>
        <Text style={footer}>Thank you<br />Gaonhae Taekwondo</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: GradingConfirmationEmail,
  subject: (data: Record<string, any>) =>
    `${data?.studentName || 'Student'} Grading Test`,
  displayName: 'Grading confirmation',
  previewData: {
    studentName: 'JANE TAN',
    products: ['Foundation 1 Grading'],
    dateTime: '15/06/2026 at 14:00',
    branchName: 'Tampines',
    branchAddress: '123 Tampines Ave 5, Singapore',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '600px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 16px' }
const h2 = { fontSize: '16px', fontWeight: 'bold', color: '#0f172a', margin: '16px 0 8px' }
const text = { fontSize: '14px', color: '#334155', lineHeight: '1.5', margin: '0 0 12px' }
const detailsBox = { backgroundColor: '#f8fafc', padding: '12px 16px', borderRadius: '6px', margin: '12px 0' }
const detailRow = { fontSize: '14px', color: '#0f172a', margin: '4px 0' }
const list = { paddingLeft: '20px', margin: '0 0 12px', color: '#334155', fontSize: '14px', lineHeight: '1.6' }
const listItem = { marginBottom: '4px' }
const hr = { borderColor: '#e2e8f0', margin: '20px 0' }
const footer = { fontSize: '12px', color: '#64748b', margin: '8px 0 0' }
