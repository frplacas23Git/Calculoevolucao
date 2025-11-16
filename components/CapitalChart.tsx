
import React, { useEffect, useRef } from 'react';

// Make Chart.js available from the global window object
declare const Chart: any;

interface CapitalChartProps {
  data: {
    labels: string[];
    values: number[];
  };
}

const CapitalChart: React.FC<CapitalChartProps> = ({ data }) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;
    
    // Destroy previous chart instance if it exists
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    chartInstanceRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [{
          label: 'Capital ao longo do tempo',
          data: data.values,
          borderColor: '#22c55e',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.15,
          pointBackgroundColor: '#22c55e',
          pointRadius: 0,
          pointHoverRadius: 5,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
             callbacks: {
                label: function(context: any) {
                    let label = context.dataset.label || '';
                    if (label) {
                        label += ': ';
                    }
                    if (context.parsed.y !== null) {
                        label += new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(context.parsed.y);
                    }
                    return label;
                }
            }
          }
        },
        scales: {
          x: {
            ticks: { color: '#9ca3af', maxRotation: 0, autoSkip: true, maxTicksLimit: 10 },
            grid: { color: 'rgba(156, 163, 175, 0.1)' }
          },
          y: {
            ticks: {
              color: '#9ca3af',
              callback: function(value: any) {
                return 'R$ ' + Number(value).toFixed(0);
              }
            },
            grid: { color: 'rgba(156, 163, 175, 0.1)' }
          }
        }
      }
    });

    // Cleanup function
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [data]);

  return <canvas ref={chartRef} style={{height: '240px'}}></canvas>;
};

export default CapitalChart;
