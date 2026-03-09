import middy from '@middy/core'
import type { ScheduledEvent, Context } from 'aws-lambda'
import { bot, Market, GuardType, SignalType, StrategyType } from './bot'

export const handler = middy<ScheduledEvent, void>().handler(
  async (_event: ScheduledEvent, _context: Context) => {
    console.log('========================================')
    console.log(`[Lambda] Starting bot run at ${new Date().toISOString()}`)

    try {
      const result = await bot({ pair: 'btc_jpy', market: Market.Spot })
        .guard({ type: GuardType.Spread, max: 0.5 })
        .guard({ type: GuardType.Volume, min: 100 })
        .signal({ type: SignalType.Rsi, period: 14, threshold: 30, direction: 'below' })
        .strategy({ type: StrategyType.Dca, amount: 1000 })
        .run()

      console.log('[Bot] result:', JSON.stringify(result, null, 2))
    } catch (err) {
      console.error('[Bot] fatal error:', err)
    }

    console.log('========================================')
  },
)
