import { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import 'chartjs-adapter-date-fns';
import type { ChartData, ChartOptions, ChartType } from 'chart.js';

Chart.register(...registerables);

interface ChartJsWrapperProps {
  id: string;
  type: ChartType;
  data: ChartData;
  options?: ChartOptions;
  height?: number;
}

export default function ChartJsWrapper({ id, type, data, options, height = 220 }: ChartJsWrapperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    chartRef.current?.destroy();
    chartRef.current = new Chart(canvasRef.current, { type, data, options });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [type, data, options]);

  return (
    <div style={{ position: 'relative', height }}>
      <canvas id={id} ref={canvasRef} />
    </div>
  );
}
