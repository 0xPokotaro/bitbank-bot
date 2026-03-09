import type { GuardHandler } from '../../types'
import { GuardType } from '../../types'

type Config = { type: GuardType.Time; start: string; end: string; timezone?: string }

function parseHHMM(hhmm: string): [number, number] {
  const [h, m] = hhmm.split(':').map(Number)
  return [h, m]
}

function timeInMinutes(h: number, m: number): number {
  return h * 60 + m
}

export const timeGuard: GuardHandler<Config> = async (config) => {
  const tz       = config.timezone ?? 'Asia/Tokyo'
  const nowInTz  = new Date().toLocaleString('en-US', { timeZone: tz })
  const now      = new Date(nowInTz)
  const nowMin   = timeInMinutes(now.getHours(), now.getMinutes())

  const [sh, sm]  = parseHHMM(config.start)
  const [eh, em]  = parseHHMM(config.end)
  const startMin  = timeInMinutes(sh, sm)
  const endMin    = timeInMinutes(eh, em)

  if (startMin <= endMin) {
    return nowMin >= startMin && nowMin < endMin
  }
  // Crosses midnight
  return nowMin >= startMin || nowMin < endMin
}
