"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as echarts from "echarts";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { getChartPoints } from "@/lib/sample-data";

type TimeRange = "1h" | "6h" | "24h" | "7d";

export function BtcJpyPriceCard() {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>("24h");

  const getOption = useCallback(
    (range: TimeRange): echarts.EChartsOption => {
      const points = getChartPoints(range);
      const times = points.map((p) => p.time);
      const prices = points.map((p) => p.price);
      return {
        backgroundColor: "transparent",
        xAxis: {
          type: "category",
          data: times,
          boundaryGap: false,
          axisLine: { lineStyle: { color: "#2c3235" } },
          axisLabel: {
            color: "#6e7781",
            fontSize: 11,
            margin: 8,
          },
          splitLine: { show: false },
          axisTick: { show: false },
        },
        yAxis: {
          type: "value",
          axisLine: { show: false },
          axisLabel: {
            color: "#6e7781",
            fontSize: 11,
            margin: 8,
            formatter: (v: number) => `¥${(v / 1_000_000).toFixed(2)}M`,
          },
          splitLine: { lineStyle: { color: "#2c3235", type: "dashed" as const } },
        },
        series: [
          {
            type: "line",
            data: prices,
            smooth: 0.3,
            symbol: "none",
            lineStyle: { color: "#f4821f", width: 2 },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: "rgba(244, 130, 31, 0.22)" },
                { offset: 1, color: "rgba(244, 130, 31, 0.01)" },
              ]),
            },
          },
        ],
        tooltip: {
          trigger: "axis",
          backgroundColor: "#1f2329",
          borderColor: "#2c3235",
          textStyle: { color: "#c9d1d9", fontSize: 12 },
          axisPointer: {
            type: "cross",
            lineStyle: { color: "#555d68", width: 1 },
            crossStyle: { color: "#555d68" },
            label: { backgroundColor: "#2c3235", color: "#c9d1d9", fontSize: 11 },
          },
          formatter: (params: unknown) => {
            const p = Array.isArray(params) ? params[0] : params;
            const item = p as { name: string; value: number };
            return `<div style="padding:2px 0"><div style="color:#6e7781;margin-bottom:3px;font-size:11px">${item.name}</div><div>¥${Number(item.value).toLocaleString("ja-JP")}</div></div>`;
          },
        },
        grid: {
          left: 16,
          right: 16,
          top: 12,
          bottom: 8,
          containLabel: true,
        },
      };
    },
    []
  );

  useEffect(() => {
    if (!chartRef.current) return;

    const chart = echarts.init(chartRef.current);
    chartInstanceRef.current = chart;
    chart.setOption(getOption(timeRange));

    const handleResize = () => chart.resize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.dispose();
      chartInstanceRef.current = null;
    };
  }, [getOption]);

  useEffect(() => {
    const chart = chartInstanceRef.current;
    if (chart) chart.setOption(getOption(timeRange));
  }, [timeRange, getOption]);

  const ranges: { value: TimeRange; label: string }[] = [
    { value: "1h", label: "1h" },
    { value: "6h", label: "6h" },
    { value: "24h", label: "24h" },
    { value: "7d", label: "7d" },
  ];

  return (
    <div className="bg-[#181b1f] border border-[#2c3235] rounded-sm">
      {/* Panel header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#2c3235]">
        <div className="flex items-center gap-2">
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
            className="text-zinc-600"
          >
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <span className="text-sm font-medium text-zinc-300">BTC / JPY Price</span>
        </div>
        <div className="flex items-center gap-0.5">
          {ranges.map(({ value, label }) => (
            <Button
              key={value}
              size="sm"
              onClick={() => setTimeRange(value)}
              aria-pressed={timeRange === value}
              aria-label={`${label}の範囲で表示`}
              className={cn(
                "h-6 px-2 text-xs rounded-sm font-normal",
                timeRange === value
                  ? "bg-orange-600/20 text-orange-400 border border-orange-600/40 hover:bg-orange-600/30"
                  : "bg-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/50 border border-transparent"
              )}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div ref={chartRef} className="h-72 w-full" />
    </div>
  );
}
