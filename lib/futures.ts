export interface InstrumentInfo {
  name: string
  exchange: string
}

export const FUTURES_INSTRUMENTS: Record<string, InstrumentInfo> = {
  NQ:  { name: 'E-mini Nasdaq-100 Futures',   exchange: 'CME'   },
  ES:  { name: 'E-mini S&P 500 Futures',       exchange: 'CME'   },
  YM:  { name: 'E-mini Dow Jones Futures',     exchange: 'CBOT'  },
  GC:  { name: 'Gold Futures',                 exchange: 'COMEX' },
  CL:  { name: 'Crude Oil Futures',            exchange: 'NYMEX' },
  RTY: { name: 'E-mini Russell 2000 Futures',  exchange: 'CME'   },
  NKD: { name: 'Nikkei 225 Dollar Futures',    exchange: 'CME'   },
  MNQ: { name: 'Micro E-mini Nasdaq-100',      exchange: 'CME'   },
  MES: { name: 'Micro E-mini S&P 500',         exchange: 'CME'   },
  MYM: { name: 'Micro E-mini Dow Jones',       exchange: 'CBOT'  },
  MGC: { name: 'Micro Gold Futures',           exchange: 'COMEX' },
  MCL: { name: 'Micro Crude Oil Futures',      exchange: 'NYMEX' },
  M2K: { name: 'Micro E-mini Russell 2000',    exchange: 'CME'   },
}

// Matches a real futures contract-month suffix:
//   Letter+YY  (e.g. "Z23"),  digit+!  ("1!"),  or just "!".
const CONTRACT_SUFFIX_RE = /([FGHJKMNQUVXZ]\d{2}|\d{1,2}!?|!)$/

export function getInstrumentInfo(symbol: string): InstrumentInfo {
  const upper = symbol.toUpperCase()
  if (FUTURES_INSTRUMENTS[upper]) return FUTURES_INSTRUMENTS[upper]
  const base = upper.replace(CONTRACT_SUFFIX_RE, '')
  return FUTURES_INSTRUMENTS[base] ?? { name: symbol, exchange: '—' }
}

/** Dollar value per full point for each futures instrument */
export const FUTURES_MULTIPLIERS: Record<string, number> = {
  // Full-size contracts
  NQ:  20,    // E-mini Nasdaq-100   (CME)
  ES:  50,    // E-mini S&P 500      (CME)
  YM:  5,     // E-mini Dow Jones    (CBOT)
  GC:  100,   // Gold                (COMEX)
  CL:  1000,  // Crude Oil           (NYMEX)
  RTY: 50,    // E-mini Russell 2000 (CME)
  NKD: 5,     // Nikkei 225 Dollar   (CME)
  // Micro contracts
  MNQ: 2,     // Micro Nasdaq-100
  MES: 5,     // Micro S&P 500
  MYM: 0.5,   // Micro Dow Jones
  MGC: 10,    // Micro Gold
  MCL: 100,   // Micro Crude Oil
  M2K: 5,     // Micro Russell 2000
}

/**
 * Returns the point multiplier for a symbol, stripping any contract-month
 * suffix (e.g. "NQ1!" → "NQ", "ESZ23" → "ES").
 */
export function getMultiplier(symbol: string): number {
  const upper = symbol.toUpperCase()
  if (FUTURES_MULTIPLIERS[upper] !== undefined) return FUTURES_MULTIPLIERS[upper]
  const base = upper.replace(CONTRACT_SUFFIX_RE, '')
  return FUTURES_MULTIPLIERS[base] ?? 1
}

export interface PnlResult {
  grossPnl: number
  netPnl: number
  multiplier: number
  points: number
}

/**
 * Calculates Gross P&L and Net P&L for a completed futures trade.
 *
 * Formula:
 *   LONG  → points = exit − entry
 *   SHORT → points = entry − exit
 *   grossPnl = points × multiplier × quantity
 *   netPnl   = grossPnl − fees
 */
export function calculateTradePnl(
  entryPrice: number,
  exitPrice: number,
  quantity: number,
  direction: 'long' | 'short',
  symbol: string,
  fees: number = 0,
): PnlResult {
  const multiplier = getMultiplier(symbol)
  const points =
    direction === 'long'
      ? exitPrice - entryPrice
      : entryPrice - exitPrice

  const grossPnl = points * multiplier * quantity
  const netPnl   = grossPnl - fees

  return { grossPnl, netPnl, multiplier, points }
}

/** Format a dollar P&L value with sign, e.g. +$1,234.50 or -$80.00 */
export function formatPnl(value: number): string {
  const abs = Math.abs(value)
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(abs)
  return value >= 0 ? `+${formatted}` : `-${formatted}`
}

/** Format a dollar amount without a sign, e.g. $142,500.00 */
export function formatDollar(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value)
}
