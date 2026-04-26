'use client'

import { useEffect, useRef, useState } from 'react'

// ────────────────────────────────────────────────────────────────────────────
// Date input — strict DD/MM/YYYY.
//   Stores ISO YYYY-MM-DD on the parent.
//   Auto-inserts slashes as the user types digits.
// ────────────────────────────────────────────────────────────────────────────

function isoToDdmmyyyy(iso: string): string {
  if (!iso) return ''
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return ''
  const [, y, mo, d] = m
  return `${d}/${mo}/${y}`
}

function ddmmyyyyToIso(text: string): string | null {
  const m = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return null
  const [, d, mo, y] = m
  const day   = parseInt(d,  10)
  const month = parseInt(mo, 10)
  const year  = parseInt(y,  10)
  if (year < 1970 || year > 2100) return null
  if (month < 1  || month > 12)   return null
  if (day   < 1  || day   > 31)   return null
  // Verify the date actually exists (e.g. reject 31/02/2025)
  const dt = new Date(Date.UTC(year, month - 1, day))
  if (
    dt.getUTCFullYear() !== year ||
    dt.getUTCMonth()    !== month - 1 ||
    dt.getUTCDate()     !== day
  ) return null
  return `${y}-${mo}-${d}`
}

function maskDate(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

interface DateFieldProps {
  value: string                   // ISO YYYY-MM-DD or ''
  onChange: (iso: string) => void
  className?: string
  placeholder?: string
  disabled?: boolean
}

export function DateField({ value, onChange, className, placeholder, disabled }: DateFieldProps) {
  const [text, setText] = useState(() => isoToDdmmyyyy(value))
  const lastEmittedRef = useRef(value)

  // Resync from parent only when parent value actually changed externally
  useEffect(() => {
    if (value !== lastEmittedRef.current) {
      setText(isoToDdmmyyyy(value))
      lastEmittedRef.current = value
    }
  }, [value])

  function handleChange(raw: string) {
    const masked = maskDate(raw)
    setText(masked)
    const iso = ddmmyyyyToIso(masked) ?? ''
    if (iso !== lastEmittedRef.current) {
      lastEmittedRef.current = iso
      onChange(iso)
    }
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder={placeholder ?? 'DD/MM/YYYY'}
      value={text}
      disabled={disabled}
      onChange={(e) => handleChange(e.target.value)}
      maxLength={10}
      dir="ltr"
      className={className}
    />
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Time input — strict 24-hour HH:mm.
//   Stores "HH:mm" on the parent.
// ────────────────────────────────────────────────────────────────────────────

function isValidTime(text: string): boolean {
  const m = text.match(/^(\d{2}):(\d{2})$/)
  if (!m) return false
  const h  = parseInt(m[1], 10)
  const mi = parseInt(m[2], 10)
  return h >= 0 && h <= 23 && mi >= 0 && mi <= 59
}

function maskTime(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}:${digits.slice(2)}`
}

interface TimeFieldProps {
  value: string                   // "HH:mm" or ''
  onChange: (hhmm: string) => void
  className?: string
  placeholder?: string
  disabled?: boolean
}

export function TimeField({ value, onChange, className, placeholder, disabled }: TimeFieldProps) {
  const [text, setText] = useState(value)
  const lastEmittedRef = useRef(value)

  useEffect(() => {
    if (value !== lastEmittedRef.current) {
      setText(value)
      lastEmittedRef.current = value
    }
  }, [value])

  function handleChange(raw: string) {
    const masked = maskTime(raw)
    setText(masked)
    const next = isValidTime(masked) ? masked : ''
    if (next !== lastEmittedRef.current) {
      lastEmittedRef.current = next
      onChange(next)
    }
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder={placeholder ?? 'HH:mm'}
      value={text}
      disabled={disabled}
      onChange={(e) => handleChange(e.target.value)}
      maxLength={5}
      dir="ltr"
      className={className}
    />
  )
}
