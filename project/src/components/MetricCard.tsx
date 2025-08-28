import React from 'react';
import { DivideIcon as LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string;
  subValue?: string;
  icon: LucideIcon;
  color: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
}

export function MetricCard({ title, value, subValue, icon: Icon, color, trend, trendValue }: MetricCardProps) {
  const getTrendColor = () => {
    switch (trend) {
      case 'up': return 'text-green-400';
      case 'down': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getTrendSymbol = () => {
    switch (trend) {
      case 'up': return '↗';
      case 'down': return '↘';
      default: return '→';
    }
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-all duration-200 hover:shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-gray-300 text-sm font-medium">{title}</h3>
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      
      <div className="space-y-1">
        <p className="text-2xl font-bold text-white">{value}</p>
        {subValue && (
          <p className="text-sm text-gray-400">{subValue}</p>
        )}
        {trend && trendValue && (
          <div className={`flex items-center text-xs ${getTrendColor()}`}>
            <span className="mr-1">{getTrendSymbol()}</span>
            <span>{trendValue}</span>
          </div>
        )}
      </div>
    </div>
  );
}