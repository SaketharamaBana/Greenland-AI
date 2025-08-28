import React from 'react';
import { EnergyData } from '../types/energy';

interface EnergyChartProps {
  data: EnergyData[];
  height?: number;
}

export function EnergyChart({ data, height = 200 }: EnergyChartProps) {
  if (!data.length) return <div className="bg-gray-800 rounded-xl p-4">No data available</div>;

  const maxValue = Math.max(...data.map(d => Math.max(d.kwh, d.solarGeneration || 0)));
  const minValue = Math.min(...data.map(d => Math.min(d.kwh, d.solarGeneration || 0)));
  const range = maxValue - minValue;

  const getY = (value: number) => {
    return height - ((value - minValue) / range) * height;
  };

  const getX = (index: number) => {
    return (index / (data.length - 1)) * 100;
  };

  // Create path for consumption line
  const consumptionPath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.kwh)}`)
    .join(' ');

  // Create path for solar generation line
  const solarPath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.solarGeneration || 0)}`)
    .join(' ');

  // Create gradient area for consumption
  const consumptionArea = `${consumptionPath} L 100 ${height} L 0 ${height} Z`;

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-4">Energy Consumption & Generation</h3>
      
      <div className="relative">
        <svg width="100%" height={height} viewBox={`0 0 100 ${height}`} className="overflow-visible">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map(percent => (
            <line
              key={percent}
              x1="0"
              y1={percent * height}
              x2="100"
              y2={percent * height}
              stroke="#374151"
              strokeWidth="0.5"
              opacity="0.5"
            />
          ))}
          
          {/* Consumption area */}
          <path
            d={consumptionArea}
            fill="url(#consumptionGradient)"
            opacity="0.3"
          />
          
          {/* Consumption line */}
          <path
            d={consumptionPath}
            fill="none"
            stroke="#60A5FA"
            strokeWidth="2"
            className="animate-pulse"
          />
          
          {/* Solar generation line */}
          <path
            d={solarPath}
            fill="none"
            stroke="#34D399"
            strokeWidth="2"
          />
          
          {/* Data points */}
          {data.slice(-12).map((d, i) => (
            <g key={i}>
              <circle
                cx={getX(data.length - 12 + i)}
                cy={getY(d.kwh)}
                r="2"
                fill="#60A5FA"
                className="animate-pulse"
              />
              <circle
                cx={getX(data.length - 12 + i)}
                cy={getY(d.solarGeneration || 0)}
                r="2"
                fill="#34D399"
              />
            </g>
          ))}
          
          {/* Gradients */}
          <defs>
            <linearGradient id="consumptionGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#60A5FA" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
        
        {/* Legend */}
        <div className="flex items-center justify-center space-x-6 mt-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-400 rounded"></div>
            <span className="text-sm text-gray-300">Consumption</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-400 rounded"></div>
            <span className="text-sm text-gray-300">Solar Generation</span>
          </div>
        </div>
      </div>
    </div>
  );
}