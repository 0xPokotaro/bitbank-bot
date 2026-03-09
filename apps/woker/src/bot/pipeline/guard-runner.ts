import type { GuardConfig, MarketContext, ExchangeAdapter } from '../types'
import { GuardType, Market } from '../types'
import { spreadGuard }           from './guards/spread'
import { volumeGuard }           from './guards/volume'
import { timeGuard }             from './guards/time'
import { balanceGuard }          from './guards/balance'
import { marginRatioGuard }      from './guards/margin-ratio'
import { fundingRateLimitGuard } from './guards/funding-rate-limit'

type AnyGuardHandler = (config: any, ctx: MarketContext<any>, adapter?: ExchangeAdapter) => Promise<boolean>

const GUARD_HANDLERS: Record<GuardType, AnyGuardHandler> = {
  [GuardType.Spread]:           spreadGuard,
  [GuardType.Volume]:           volumeGuard,
  [GuardType.Time]:             timeGuard,
  [GuardType.Balance]:          balanceGuard,
  [GuardType.MarginRatio]:      marginRatioGuard,
  [GuardType.FundingRateLimit]: fundingRateLimitGuard,
}

/**
 * Run all guards in AND order. Returns false on the first failure.
 */
export async function runGuards<M extends Market>(
  configs: GuardConfig<M>[],
  ctx:     MarketContext<M>,
): Promise<boolean> {
  for (const config of configs) {
    const handler = GUARD_HANDLERS[config.type as GuardType]
    if (!handler) throw new Error(`Unknown guard type: ${config.type}`)
    const passed = await handler(config, ctx)
    if (!passed) {
      console.log(`[Guard] FAILED: ${config.type}`)
      return false
    }
    console.log(`[Guard] passed: ${config.type}`)
  }
  return true
}
