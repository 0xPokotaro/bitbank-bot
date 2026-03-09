// BTC/JPY サンプルデータ
// シード固定の疑似乱数で決定的に生成 — データは常に同じ値になる

export type Candle = {
  timestamp: number; // Unix ms
  open: number;      // ¥
  high: number;      // ¥
  low: number;       // ¥
  close: number;     // ¥
  volume: number;    // BTC
};

export type ChartPoint = {
  time: string;
  price: number;
};

// ---- 内部ユーティリティ ---------------------------------------------------

/** シード付き LCG 疑似乱数 (0 以上 1 未満) */
function seededRand(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const HOUR_MS = 3_600_000;
const MIN5_MS = 300_000;

/** 基準時刻: 2026-03-09 12:00 JST (固定) */
const REF_TIME = new Date("2026-03-09T12:00:00+09:00").getTime();

/**
 * OHLCV ローソク足を決定的に生成する
 * @param count     ローソク本数
 * @param stepMs    1本あたりの時間幅 (ms)
 * @param startPrice 開始価格 (¥)
 * @param seed      乱数シード
 * @param bias      トレンドバイアス (0.5=中立, <0.5=強気, >0.5=弱気)
 * @param bodyVol   1本あたりのボディ変動幅
 */
function buildCandles(
  count: number,
  stepMs: number,
  startPrice: number,
  seed: number,
  bias = 0.47,
  bodyVol = 0.008,
): Candle[] {
  const rand = seededRand(seed);
  const candles: Candle[] = [];
  let price = startPrice;

  for (let i = count; i >= 0; i--) {
    const open = price;
    const bodyMove = (rand() - bias) * bodyVol;
    const close = Math.round(open * (1 + bodyMove));
    const wickUp = rand() * bodyVol * 0.7;
    const wickDown = rand() * bodyVol * 0.5;
    const high = Math.round(Math.max(open, close) * (1 + wickUp));
    const low = Math.round(Math.min(open, close) * (1 - wickDown));
    const volume = Math.round((0.1 + rand() * 4.5) * 100) / 100;
    candles.push({ timestamp: REF_TIME - i * stepMs, open, high, low, close, volume });
    price = close;
  }

  return candles;
}

// ---- 公開データセット -------------------------------------------------------

/** 時間足ローソク足: index 0 = 168h 前、index 168 = REF_TIME */
export const HOURLY_CANDLES: Candle[] = buildCandles(
  168,
  HOUR_MS,
  10_100_000,
  0xf00dcafe,
);

/** 5 分足ローソク足: 直近 1 時間 (13 本) */
export const FIVEMIN_CANDLES: Candle[] = buildCandles(
  12,
  MIN5_MS,
  HOURLY_CANDLES[HOURLY_CANDLES.length - 2].close,
  0xdeadbeef,
  0.49,
  0.003,
);

/** 日足ローソク足: 時間足を集約 (7 本) */
export const DAILY_CANDLES: Candle[] = Array.from({ length: 7 }, (_, d) => {
  const slice = HOURLY_CANDLES.slice(d * 24, d * 24 + 24);
  return {
    timestamp: slice[0].timestamp,
    open: slice[0].open,
    high: Math.max(...slice.map((c) => c.high)),
    low: Math.min(...slice.map((c) => c.low)),
    close: slice[slice.length - 1].close,
    volume: Math.round(slice.reduce((s, c) => s + c.volume, 0) * 100) / 100,
  };
});

// ---- 統計値 (Stats パネル用) -----------------------------------------------

/** 現在価格 (5 分足の最終 close) */
export const currentPrice = FIVEMIN_CANDLES.at(-1)!.close;

const hourly24h = HOURLY_CANDLES.slice(-24);

/** 24 時間高値 */
export const high24h = Math.max(
  ...hourly24h.map((c) => c.high),
  ...FIVEMIN_CANDLES.map((c) => c.high),
);

/** 24 時間安値 */
export const low24h = Math.min(
  ...hourly24h.map((c) => c.low),
  ...FIVEMIN_CANDLES.map((c) => c.low),
);

const open24h = hourly24h[0].open;

/** 24 時間変化額 (¥) */
export const change24hAbs = currentPrice - open24h;

/** 24 時間変化率 (%) */
export const change24hPct = (change24hAbs / open24h) * 100;

// ---- チャートデータ取得 -------------------------------------------------------

/** 各時間レンジ向けのチャートポイント配列を返す */
export function getChartPoints(range: "1h" | "6h" | "24h" | "7d"): ChartPoint[] {
  const fmtTime = (ts: number) =>
    new Date(ts).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
  const fmtDate = (ts: number) =>
    new Date(ts).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" });

  switch (range) {
    case "1h":
      return FIVEMIN_CANDLES.map((c) => ({ time: fmtTime(c.timestamp), price: c.close }));
    case "6h":
      return HOURLY_CANDLES.slice(-6).map((c) => ({ time: fmtTime(c.timestamp), price: c.close }));
    case "24h":
      return HOURLY_CANDLES.slice(-24).map((c) => ({ time: fmtTime(c.timestamp), price: c.close }));
    case "7d":
      return DAILY_CANDLES.map((c) => ({ time: fmtDate(c.timestamp), price: c.close }));
  }
}
