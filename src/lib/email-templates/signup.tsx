import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface SignupEmailProps {
  siteName: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your email to finish setting up Kyte</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandRow}>
          <Text style={mark}>K</Text>
          <Text style={brand}>{siteName}</Text>
        </Section>
        <Heading style={h1}>Confirm your email</Heading>
        <Text style={text}>Confirm your email address to finish setting up your Kyte account.</Text>
        <Button style={button} href={confirmationUrl}>Confirm email</Button>
        <Text style={help}>If the button does not work, copy and paste this link into your browser:</Text>
        <Text style={url}>{confirmationUrl}</Text>
        <Text style={footer}>
          If you didn't create an account, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = {
  backgroundColor: '#ffffff',
  fontFamily: 'Arial, Helvetica, sans-serif',
  margin: '0',
  padding: '32px 12px',
}
const container = {
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  margin: '0 auto',
  maxWidth: '520px',
  padding: '36px 32px',
}
const brandRow = { margin: '0 0 32px' }
const mark = {
  backgroundColor: '#0ea5e9',
  borderRadius: '8px',
  color: '#071018',
  display: 'inline-block',
  fontSize: '20px',
  fontWeight: '700' as const,
  lineHeight: '40px',
  margin: '0 12px 0 0',
  textAlign: 'center' as const,
  width: '40px',
}
const brand = {
  color: '#111827',
  display: 'inline-block',
  fontSize: '18px',
  fontWeight: '700' as const,
  margin: '0',
  verticalAlign: 'middle',
}
const h1 = {
  color: '#111827',
  fontSize: '28px',
  fontWeight: '700' as const,
  lineHeight: '1.25',
  margin: '0 0 16px',
}
const text = {
  color: '#4b5563',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 24px',
}
const button = {
  backgroundColor: '#0ea5e9',
  borderRadius: '8px',
  color: '#ffffff',
  display: 'block',
  fontSize: '16px',
  fontWeight: '700' as const,
  padding: '14px 24px',
  textAlign: 'center' as const,
  textDecoration: 'none',
}
const help = { color: '#6b7280', fontSize: '12px', lineHeight: '1.5', margin: '28px 0 6px' }
const url = { color: '#0369a1', fontSize: '12px', lineHeight: '1.5', margin: '0', wordBreak: 'break-all' as const }
const footer = { borderTop: '1px solid #e5e7eb', color: '#9ca3af', fontSize: '12px', margin: '28px 0 0', paddingTop: '20px' }
