import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import type { ChartPoint } from '../hooks/usePointsOverTime';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const COLORS = [
  '#4ade80', '#60a5fa', '#f472b6', '#fbbf24', '#a78bfa',
  '#fb923c', '#34d399', '#f87171', '#818cf8', '#facc15',
  '#2dd4bf', '#e879f9', '#22d3ee', '#a3e635', '#f97316',
];

interface Props {
  data: ChartPoint[];
  userNames: Map<string, string>;
}

export function PointsChart({ data, userNames }: Props) {
  if (data.length === 0) return null;

  const userIds = [...userNames.keys()];

  const chartData = {
    labels: data.map((d) => d.label),
    datasets: userIds.map((userId, i) => ({
      label: userNames.get(userId) || userId,
      data: data.map((d) => (d[userId] as number) || 0),
      borderColor: COLORS[i % COLORS.length],
      backgroundColor: COLORS[i % COLORS.length] + '30',
      tension: 0.3,
      pointRadius: 3,
      pointHoverRadius: 5,
    })),
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { color: '#9ca3af', font: { size: 11 }, padding: 15, usePointStyle: true },
      },
    },
    scales: {
      x: {
        ticks: { color: '#6b7280', font: { size: 10 } },
        grid: { color: '#1f2937' },
      },
      y: {
        ticks: { color: '#6b7280', font: { size: 10 } },
        grid: { color: '#1f2937' },
        beginAtZero: true,
      },
    },
  };

  return <Line data={chartData} options={options} />;
}
