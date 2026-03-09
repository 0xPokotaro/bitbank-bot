import type { StrategyHandler, Order } from '../../types'
import { StrategyType } from '../../types'

type Config = { type: StrategyType.Grid; levels: number; rangePercent: number; amount: number }

const PRICE_TOLERANCE = 0.005 // 0.5% tolerance when checking existing orders

export const gridStrategy: StrategyHandler<Config> = async (config, ctx, adapter) => {
  const { last }      = await ctx.ticker()
  const openOrders    = await ctx.openOrders()
  const { levels, rangePercent, amount } = config

  const halfRange  = (last * rangePercent) / 100 / 2
  const priceStep  = (halfRange * 2) / levels
  const orders: Order[] = []

  // Build buy levels below current price and sell levels above
  const gridLevels: Array<{ price: number; side: 'buy' | 'sell' }> = []
  for (let i = 1; i <= Math.floor(levels / 2); i++) {
    gridLevels.push({ price: last - priceStep * i, side: 'buy' })
    gridLevels.push({ price: last + priceStep * i, side: 'sell' })
  }
  if (levels % 2 !== 0) {
    gridLevels.push({ price: last - priceStep * 0.5, side: 'buy' })
  }

  for (const level of gridLevels) {
    const alreadyExists = openOrders.some(
      (o) =>
        o.side === level.side &&
        o.price !== undefined &&
        Math.abs(o.price - level.price) / level.price <= PRICE_TOLERANCE,
    )
    if (alreadyExists) continue

    console.log(`[Strategy] grid placing ${level.side} @ ${level.price.toFixed(2)}`)
    const order = await adapter.placeOrder({
      pair:   ctx.pair,
      side:   level.side,
      type:   'limit',
      amount: amount,
      price:  level.price,
    })
    orders.push(order)
  }

  return orders
}
