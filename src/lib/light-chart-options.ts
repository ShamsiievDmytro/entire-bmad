export const LIGHT_CHART_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
      labels: { color: '#555', font: { family: 'Inter' } },
    },
    tooltip: {
      backgroundColor: '#ffffff',
      titleColor: '#1a1a2e',
      bodyColor: '#555',
      borderColor: 'rgba(0, 0, 0, 0.12)',
      borderWidth: 1,
    },
  },
  scales: {
    x: {
      grid: { color: 'rgba(0, 0, 0, 0.06)' },
      ticks: { color: '#666', font: { family: 'Inter', size: 11 } },
      border: { display: false },
    },
    y: {
      grid: { color: 'rgba(0, 0, 0, 0.06)' },
      ticks: { color: '#666', font: { family: 'Inter', size: 11 } },
      border: { display: false },
    },
  },
};

export const LIGHT_LWC_COLORS = {
  lineColor: '#1976d2',
  areaTopColor: 'rgba(25, 118, 210, 0.1)',
  areaBottomColor: 'transparent',
  gridLinesColor: 'rgba(0, 0, 0, 0.06)',
  crosshairColor: 'rgba(0, 0, 0, 0.2)',
  backgroundColor: 'transparent',
  textColor: '#333',
} as const;

export const DATASET_COLORS = {
  purple: '#7c3aed',
  blue: '#1976d2',
  green: '#16a34a',
  amber: '#d97706',
  red: '#dc2626',
  gray: '#9ca3af',
  cyan: '#0891b2',
  pink: '#db2777',
  teal: '#0d9488',
  orange: '#ea580c',
} as const;
