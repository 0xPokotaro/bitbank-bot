import type { SignalHandler } from '../../types'
import { SignalType } from '../../types'

type Config = {
  type:      SignalType.Macd
  fast?:     number
  slow?:     number
  signal?:   number
  direction: 'golden-cross' | 'dead-cross'
}

export const macdSignal: SignalHandler<Config> = async (config, ctx) => {
  const fast   = config.fast   ?? 12
  const slow   = config.slow   ?? 26
  const signal = config.signal ?? 9

  const result = await ctx.macd(fast, slow, signal)
  const { macd, signal: sig } = result
  console.log(`[Signal] macd=${macd.toFixed(6)}, signal=${sig.toFixed(6)}, direction=${config.direction}`)

  if (config.direction === 'golden-cross') return macd > sig
  return macd < sig
}
