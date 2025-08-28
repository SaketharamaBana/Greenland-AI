import React from 'react';
import { OptimizationResult } from '../types/energy';

interface EnergyMixChartProps {
  optimization: OptimizationResult;
}

export function EnergyMixChart({ optimization }: EnergyMixChartProps) {
  const total = optimization.gridKwh + optimization.solarKwh;
  const gridPercent = total > 0 ? (optimization.gridKwh / total) * 100 : 0;
  const solarPercent = total > 0 ? (optimization.solarKwh / total) * 100 : 0;

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-4">Energy Mix Optimization</h3>
      
      <div className="space-y-4">
        {/* Stacked bar chart */}
        <div className="relative">
          <div className="flex rounded-lg overflow-hidden h-8 bg-gray-700">
            {solarPercent > 0 && (
              <div 
                className="bg-gradient-to-r from-green-400 to-green-500 flex items-center justify-center text-xs font-medium text-white transition-all duration-1000"
                style={{ width: `${solarPercent}%` }}
              >
                {solarPercent > 15 ? `${solarPercent.toFixed(0)}%` : ''}
              </div>
            )}
            {gridPercent > 0 && (
              <div 
                className="bg-gradient-to-r from-orange-400 to-orange-500 flex items-center justify-center text-xs font-medium text-white transition-all duration-1000"
                style={{ width: `${gridPercent}%` }}
              >
                {gridPercent > 15 ? `${gridPercent.toFixed(0)}%` : ''}
              </div>
            )}
          </div>
        </div>
        
        {/* Details */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-400 rounded"></div>
              <span className="text-sm text-gray-300">Solar</span>
            </div>
            <p className="text-lg font-semibold text-white">{optimization.solarKwh.toFixed(1)} kWh</p>
            <p className="text-xs text-green-400">CO₂ Saved: {optimization.carbonSaved.toFixed(1)} kg</p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-orange-400 rounded"></div>
              <span className="text-sm text-gray-300">Grid</span>
            </div>
            <p className="text-lg font-semibold text-white">{optimization.gridKwh.toFixed(1)} kWh</p>
            <p className="text-xs text-orange-400">Cost: ${optimization.totalCost.toFixed(2)}</p>
          </div>
        </div>
        
        {/* Sustainability score */}
        <div className="mt-4 p-3 bg-gray-700 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Renewable Energy</span>
            <span className="text-sm font-semibold text-green-400">{optimization.renewablePercentage.toFixed(0)}%</span>
          </div>
          <div className="mt-2 w-full bg-gray-600 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-green-400 to-green-500 h-2 rounded-full transition-all duration-1000"
              style={{ width: `${optimization.renewablePercentage}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}