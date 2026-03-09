import type { StrategyConfig, MarketContext, ExchangeAdapter, Order } from '../types'
import { StrategyType, Market } from '../types'
import { marketBuyStrategy }  from './strategies/market-buy'
import { marketSellStrategy } from './strategies/market-sell'
import { limitBuyStrategy }   from './strategies/limit-buy'
import { limitSellStrategy }  from './strategies/limit-sell'
import { dcaStrategy }        from './strategies/dca'
import { gridStrategy }       from './strategies/grid'
import { openLongStrategy }   from './strategies/open-long'
import { openShortStrategy }  from './strategies/open-short'
import { closeLongStrategy }  from './strategies/close-long'
import { closeShortStrategy } from './strategies/close-short'

type AnyStrategyHandler = (config: any, ctx: MarketContext<any>, adapter: ExchangeAdapter) => Promise<Order[]>

const STRATEGY_HANDLERS: Record<StrategyType, AnyStrategyHandler> = {
  [StrategyType.MarketBuy]:  marketBuyStrategy,
  [StrategyType.MarketSell]: marketSellStrategy,
  [StrategyType.LimitBuy]:   limitBuyStrategy,
  [StrategyType.LimitSell]:  limitSellStrategy,
  [StrategyType.Dca]:        dcaStrategy,
  [StrategyType.Grid]:       gridStrategy,
  [StrategyType.OpenLong]:   openLongStrategy,
  [StrategyType.OpenShort]:  openShortStrategy,
  [StrategyType.CloseLong]:  closeLongStrategy,
  [StrategyType.CloseShort]: closeShortStrategy,
}

/**
 * Run all strategies sequentially. Collects results; one failure does not stop others.
 */
export async function runStrategies<M extends Market>(
  configs: StrategyConfig<M>[],
  ctx:     MarketContext<M>,
  adapter: ExchangeAdapter,
): Promise<{ orders: Order[]; errors: Error[] }> {
  const orders: Order[] = []
  const errors: Error[] = []

  for (const config of configs) {
    const handler = STRATEGY_HANDLERS[config.type as StrategyType]
    if (!handler) {
      errors.push(new Error(`Unknown strategy type: ${config.type}`))
      continue
    }
    try {
      const result = await handler(config, ctx, adapter)
      orders.push(...result)
    } catch (err) {
      console.error(`[Strategy] ERROR in ${config.type}:`, err)
      errors.push(err instanceof Error ? err : new Error(String(err)))
    }
  }

  return { orders, errors }
}
