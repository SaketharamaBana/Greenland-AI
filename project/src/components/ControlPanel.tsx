import React from 'react';
import { Settings, Zap, DollarSign, Battery, Clock, TrendingUp } from 'lucide-react';

interface ControlPanelProps {
  gridPrice: number;
  onGridPriceChange: (price: number) => void;
  isLiveMode: boolean;
  onLiveModeChange: (enabled: boolean) => void;
  timeOfUse: 'peak' | 'off-peak' | 'mid-peak';
  onTimeOfUseChange: (period: 'peak' | 'off-peak' | 'mid-peak') => void;
  batteryLevel: number;
  onBatteryLevelChange: (level: number) => void;
}

export function ControlPanel({ 
  gridPrice, 
  onGridPriceChange, 
  isLiveMode, 
  onLiveModeChange,
  timeOfUse,
  onTimeOfUseChange,
  batteryLevel,
  onBatteryLevelChange
}: ControlPanelProps) {
  const timeOfUseColors = {
    'peak': 'bg-red-500',
    'mid-peak': 'bg-yellow-500',
    'off-peak': 'bg-green-500'
  };

  const timeOfUseMultipliers = {
    'peak': 1.8,
    'mid-peak': 1.0,
    'off-peak': 0.6
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <div className="flex items-center space-x-2 mb-6">
        <Settings className="w-5 h-5 text-green-400" />
        <h3 className="text-lg font-semibold text-white">Smart Control Panel</h3>
      </div>
      
      <div className="space-y-6">
        {/* Live Mode Toggle */}
        <div>
          <label className="flex items-center space-x-3 cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                checked={isLiveMode}
                onChange={(e) => onLiveModeChange(e.target.checked)}
                className="sr-only"
              />
              <div className={`w-12 h-6 rounded-full transition-colors ${isLiveMode ? 'bg-green-500' : 'bg-gray-600'}`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${isLiveMode ? 'translate-x-6' : 'translate-x-0.5'} mt-0.5`}></div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-sm text-gray-300">Real-Time Mode</span>
            </div>
          </label>
          <p className="text-xs text-gray-400 mt-1 ml-15">
            {isLiveMode ? 'Live data updates every 5 seconds' : 'Static mode - manual refresh only'}
          </p>
        </div>

        {/* Time of Use Selection */}
        <div>
          <label className="block text-sm text-gray-300 mb-3">
            <Clock className="w-4 h-4 inline mr-1" />
            Time of Use Period
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['off-peak', 'mid-peak', 'peak'] as const).map((period) => (
              <button
                key={period}
                onClick={() => onTimeOfUseChange(period)}
                className={`px-3 py-2 text-xs rounded-lg transition-all ${
                  timeOfUse === period
                    ? `${timeOfUseColors[period]} text-white shadow-lg`
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {period.charAt(0).toUpperCase() + period.slice(1).replace('-', ' ')}
              </button>
            ))}
          </div>
          <div className="mt-2 text-xs text-gray-400">
            Current multiplier: {timeOfUseMultipliers[timeOfUse]}x base rate
          </div>
        </div>
        
        {/* Grid Price Control */}
        <div>
          <label className="block text-sm text-gray-300 mb-2">
            <DollarSign className="w-4 h-4 inline mr-1" />
            Base Grid Price ($/kWh)
          </label>
          <div className="space-y-2">
            <input
              type="range"
              min="0.05"
              max="0.35"
              step="0.01"
              value={gridPrice}
              onChange={(e) => onGridPriceChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>$0.05</span>
              <span className="font-semibold text-white">
                ${gridPrice.toFixed(3)} 
                <span className="text-gray-400 ml-1">
                  (${(gridPrice * timeOfUseMultipliers[timeOfUse]).toFixed(3)} actual)
                </span>
              </span>
              <span>$0.35</span>
            </div>
          </div>
        </div>

        {/* Battery Level Control */}
        <div>
          <label className="block text-sm text-gray-300 mb-2">
            <Battery className="w-4 h-4 inline mr-1" />
            Battery Level (kWh)
          </label>
          <div className="space-y-2">
            <input
              type="range"
              min="0"
              max="50"
              step="1"
              value={batteryLevel}
              onChange={(e) => onBatteryLevelChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>0 kWh</span>
              <span className="font-semibold text-white">
                {batteryLevel.toFixed(0)} kWh ({((batteryLevel / 50) * 100).toFixed(0)}%)
              </span>
              <span>50 kWh</span>
            </div>
          </div>
          <div className="mt-2">
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-500 ${
                  batteryLevel > 40 ? 'bg-green-500' : 
                  batteryLevel > 20 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${(batteryLevel / 50) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
        
        {/* Quick Scenarios */}
        <div>
          <p className="text-sm text-gray-300 mb-3 flex items-center">
            <TrendingUp className="w-4 h-4 mr-1" />
            Quick Scenarios
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                onGridPriceChange(0.08);
                onTimeOfUseChange('off-peak');
                onBatteryLevelChange(45);
              }}
              className="px-3 py-2 text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              Optimal
            </button>
            <button
              onClick={() => {
                onGridPriceChange(0.12);
                onTimeOfUseChange('mid-peak');
                onBatteryLevelChange(25);
              }}
              className="px-3 py-2 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Standard
            </button>
            <button
              onClick={() => {
                onGridPriceChange(0.25);
                onTimeOfUseChange('peak');
                onBatteryLevelChange(10);
              }}
              className="px-3 py-2 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Peak Crisis
            </button>
            <button
              onClick={() => {
                onGridPriceChange(0.06);
                onTimeOfUseChange('off-peak');
                onBatteryLevelChange(5);
              }}
              className="px-3 py-2 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              Night Charge
            </button>
          </div>
        </div>

        {/* System Status */}
        <div className="mt-6 p-3 bg-gray-700 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-300">System Status</span>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-400">Optimizing</span>
            </div>
          </div>
          <div className="text-xs text-gray-400">
            AI algorithms actively monitoring and optimizing energy mix for maximum efficiency and cost savings.
          </div>
        </div>
      </div>
    </div>
  );
}