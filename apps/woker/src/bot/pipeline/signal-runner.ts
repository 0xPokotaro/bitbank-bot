import type { SignalConfig, MarketContext } from '../types'
import { SignalType, Market } from '../types'
import { rsiSignal }          from './signals/rsi'
import { macdSignal }         from './signals/macd'
import { priceSignal }        from './signals/price'
import { alwaysSignal }       from './signals/always'
import { fundingRateSignal }  from './signals/funding-rate'
import { openInterestSignal } from './signals/open-interest'

type AnySignalHandler = (config: any, ctx: MarketContext<any>) => Promise<boolean>

const SIGNAL_HANDLERS: Record<SignalType, AnySignalHandler> = {
  [SignalType.Rsi]:          rsiSignal,
  [SignalType.Macd]:         macdSignal,
  [SignalType.Price]:        priceSignal,
  [SignalType.Always]:       alwaysSignal,
  [SignalType.FundingRate]:  fundingRateSignal,
  [SignalType.OpenInterest]: openInterestSignal,
}

/**
 * Run all signals in OR order. Returns true on the first signal that fires.
 */
export async function runSignals<M extends Market>(
  configs: SignalConfig<M>[],
  ctx:     MarketContext<M>,
): Promise<boolean> {
  for (const config of configs) {
    const handler = SIGNAL_HANDLERS[config.type as SignalType]
    if (!handler) throw new Error(`Unknown signal type: ${config.type}`)
    const fired = await handler(config, ctx)
    if (fired) {
      console.log(`[Signal] FIRED: ${config.type}`)
      return true
    }
    console.log(`[Signal] not fired: ${config.type}`)
  }
  return false
}
