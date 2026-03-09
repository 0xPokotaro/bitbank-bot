import type { SignalHandler } from '../../types'
import { SignalType, Market } from '../../types'

type Config = { type: SignalType.OpenInterest; threshold: number; direction: 'above' | 'below' }

export const openInterestSignal: SignalHandler<Config, Market.Perpetual | Market.Futures> = async (config, ctx) => {
  const oi = await (ctx as any).openInterest()
  console.log(`[Signal] openInterest=${oi}, threshold=${config.threshold}, direction=${config.direction}`)
  return config.direction === 'above' ? oi > config.threshold : oi < config.threshold
}
