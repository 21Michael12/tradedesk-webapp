import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Trade } from '@/types'

const HEADERS = [
  'id',
  'symbol',
  'direction',
  'trade_type',
  'entry_time',
  'exit_time',
  'entry_price',
  'exit_price',
  'quantity',
  'gross_pnl',
  'fees',
  'net_pnl',
  'stop_loss',
  'take_profit',
  'risk_reward',
  'tags',
  'notes',
] as const

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return ''
  const s = Array.isArray(v) ? v.join('; ') : String(v)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: rows } = await supabase
    .from('trades')
    .select('*')
    .eq('user_id', user.id)
    .order('entry_time', { ascending: false })

  const trades = (rows as Trade[] | null) ?? []

  const lines = [HEADERS.join(',')]
  for (const t of trades) {
    lines.push(HEADERS.map((h) => csvEscape((t as unknown as Record<string, unknown>)[h])).join(','))
  }

  // BOM so Excel opens UTF-8 (Hebrew tags / notes) correctly
  const body = '﻿' + lines.join('\n')
  const filename = `tradedesk-${new Date().toISOString().slice(0, 10)}.csv`

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type':        'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control':       'no-store',
    },
  })
}
