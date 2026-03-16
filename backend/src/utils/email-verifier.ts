import { Resolver as PromisesResolver } from 'dns/promises'
import { z } from 'zod'
import env from '../config/env'

const emailFormatSchema = z.string().email('Email inválido')

const DISPOSABLE_DOMAINS = new Set<string>([
  'mailinator.com',
  '10minutemail.com',
  'guerrillamail.com',
  'yopmail.com',
  'tempmail.com',
])

export interface EmailVerificationResult {
  formatValid: boolean
  domain: string | null
  mxFound: boolean
  disposable: boolean
  allowedDomain: boolean
}

export async function verifyEmailAddress(email: string, resolver = new PromisesResolver()): Promise<EmailVerificationResult> {
  const trimmed = (email || '').trim().toLowerCase()
  const formatValid = emailFormatSchema.safeParse(trimmed).success

  const domain = formatValid ? trimmed.split('@')[1] : null
  const allowedDomain = !!domain && trimmed.endsWith(`@${env.ALLOWED_EMAIL_DOMAIN}`)
  const disposable = !!domain && DISPOSABLE_DOMAINS.has(domain)

  let mxFound = false
  if (domain) {
    try {
      const records = await resolver.resolveMx(domain)
      mxFound = Array.isArray(records) && records.length > 0
    } catch {
      mxFound = false
    }
  }

  return { formatValid, domain, mxFound, disposable, allowedDomain }
}
