import { BtcJpyPriceCard } from "@/components/dashboard/btc-jpy-price-card";
import {
  currentPrice,
  change24hPct,
  change24hAbs,
  high24h,
  low24h,
} from "@/lib/sample-data";

function jpy(n: number): string {
  return `¥${Math.abs(n).toLocaleString("ja-JP")}`;
}

const statPanels = [
  {
    title: "現在価格",
    value: jpy(currentPrice),
    sub: "BTC / JPY",
    valueClass: "text-zinc-100",
  },
  {
    title: "24時間変化",
    value: `${change24hPct >= 0 ? "+" : ""}${change24hPct.toFixed(2)}%`,
    sub: `${change24hAbs >= 0 ? "+" : "−"}${jpy(change24hAbs)}`,
    valueClass: change24hPct >= 0 ? "text-green-400" : "text-red-400",
  },
  {
    title: "24時間高値",
    value: jpy(high24h),
    sub: "High",
    valueClass: "text-zinc-100",
  },
  {
    title: "24時間安値",
    value: jpy(low24h),
    sub: "Low",
    valueClass: "text-zinc-100",
  },
];

export default function Home() {
  return (
    <div className="p-3 md:p-4 space-y-3">
      {/* Dashboard header */}
      <div className="flex items-center justify-between py-1">
        <div>
          <h1 className="text-sm font-medium text-zinc-200">BTC/JPY ダッシュボード</h1>
          <p className="text-[11px] text-zinc-500 mt-0.5">bitbank Bot Analytics</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-zinc-400 bg-[#1c2025] border border-[#2c3235] rounded-sm px-2.5 py-1 select-none">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-zinc-500"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span>直近 24 時間</span>
        </div>
      </div>

      {/* Stat panels */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {statPanels.map((panel) => (
          <div
            key={panel.title}
            className="bg-[#181b1f] border border-[#2c3235] rounded-sm p-3 flex flex-col gap-1"
          >
            <div className="text-[10px] uppercase tracking-widest text-zinc-500">
              {panel.title}
            </div>
            <div className={`text-2xl font-light tabular-nums ${panel.valueClass}`}>
              {panel.value}
            </div>
            <div className="text-[11px] text-zinc-500">{panel.sub}</div>
          </div>
        ))}
      </div>

      {/* Price chart */}
      <BtcJpyPriceCard />
    </div>
  );
}
