import type { SignalHandler } from '../../types'
import { SignalType, Market } from '../../types'

type Config = { type: SignalType.FundingRate; threshold: number; direction: 'above' | 'below' }

export const fundingRateSignal: SignalHandler<Config, Market.Perpetual | Market.Futures> = async (config, ctx) => {
  const { rate } = await (ctx as any).fundingRate()
  console.log(`[Signal] fundingRate=${rate}, threshold=${config.threshold}, direction=${config.direction}`)
  return config.direction === 'above' ? rate > config.threshold : rate < config.threshold
}
