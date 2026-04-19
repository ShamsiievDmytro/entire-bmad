import { useEffect, useRef } from 'react';
import { createChart, LineSeries } from 'lightweight-charts';
import type { IChartApi } from 'lightweight-charts';
import { LIGHT_LWC_COLORS } from '../../lib/light-chart-options';

interface LightweightChartWrapperProps {
  id: string;
  series: Array<{ time: number; value: number }>;
  lineColor?: string;
  height?: number;
}

export default function LightweightChartWrapper({
  id,
  series,
  lineColor = LIGHT_LWC_COLORS.lineColor,
  height = 200,
}: LightweightChartWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    chartRef.current?.remove();
    while (containerRef.current.firstChild) {
      containerRef.current.removeChild(containerRef.current.firstChild);
    }

    if (!series.length) return;

    const deduped = series.filter((p, i) => i === 0 || p.time !== series[i - 1].time);

    const chart = createChart(containerRef.current, {
      layout: { background: { color: 'transparent' }, textColor: LIGHT_LWC_COLORS.textColor },
      grid: {
        vertLines: { color: LIGHT_LWC_COLORS.gridLinesColor },
        horzLines: { color: LIGHT_LWC_COLORS.gridLinesColor },
      },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: false },
      handleScroll: false,
      handleScale: false,
      autoSize: true,
    });

    const s = chart.addSeries(LineSeries, {
      color: lineColor,
      lineWidth: 2,
      pointMarkersVisible: true,
    });
    s.setData(deduped);
    chart.timeScale().fitContent();
    chartRef.current = chart;

    return () => {
      chartRef.current?.remove();
      chartRef.current = null;
    };
  }, [series, lineColor]);

  if (!series.length) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height,
          color: '#999',
          fontFamily: 'Inter, sans-serif',
          fontSize: 14,
        }}
      >
        No data available
      </div>
    );
  }

  return <div id={id} ref={containerRef} style={{ height }} />;
}
