// Helpers for the employee onboarding pipeline.

const WORK_DOMAIN = process.env.NEXT_PUBLIC_WORK_EMAIL_DOMAIN || 'mavixy.com'

/** Short, URL-safe, unguessable invite token. */
export function makeInviteToken(): string {
  const bytes = new Uint8Array(18)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}

/** Propose a work email from a full name, e.g. "Girish Kumar" -> girish@mavixy.com. */
export function proposeWorkEmail(fullName: string): string {
  const first = (fullName || '').trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'employee'
  return `${first}@${WORK_DOMAIN}`
}

export const AADHAAR_RE = /^\d{4}\s?\d{4}\s?\d{4}$/
export const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/
export const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/

export interface IfscResult {
  BANK: string
  BRANCH: string
  CITY?: string
  STATE?: string
}

/** Look up bank + branch from an IFSC code via Razorpay's free public API. */
export async function lookupIfsc(ifsc: string): Promise<IfscResult | null> {
  const code = ifsc.trim().toUpperCase()
  if (!IFSC_RE.test(code)) return null
  try {
    const res = await fetch(`https://ifsc.razorpay.com/${code}`)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export type OnboardingStatus = 'pending' | 'submitted' | 'completed'

export interface OnboardingInvite {
  id: string
  token: string
  role: string
  title: string | null
  work_email: string | null
  status: OnboardingStatus
  created_by: string | null
  full_name: string | null
  personal_email: string | null
  phone: string | null
  emergency_phone: string | null
  aadhar_number: string | null
  pan_number: string | null
  aadhar_path: string | null
  pan_path: string | null
  bank_account_number: string | null
  bank_ifsc: string | null
  bank_name: string | null
  bank_branch: string | null
  submitted_at: string | null
  m365_email: string | null
  created_profile_id: string | null
  completed_at: string | null
  created_at: string
}
