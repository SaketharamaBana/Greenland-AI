import React from 'react';
import { AlertTriangle, Activity } from 'lucide-react';
import { AnomalyData } from '../types/energy';

interface AnomalyAlertProps {
  anomalies: AnomalyData[];
  recentCount: number;
}

export function AnomalyAlert({ anomalies, recentCount }: AnomalyAlertProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-400 bg-red-900/20 border-red-700';
      case 'medium': return 'text-yellow-400 bg-yellow-900/20 border-yellow-700';
      case 'low': return 'text-blue-400 bg-blue-900/20 border-blue-700';
      default: return 'text-gray-400 bg-gray-800 border-gray-600';
    }
  };

  const recentAnomalies = anomalies
    .filter(a => a.isAnomaly)
    .slice(-5); // Show last 5 anomalies

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-orange-400" />
          <h3 className="text-lg font-semibold text-white">Anomaly Detection</h3>
        </div>
        <div className="flex items-center space-x-2">
          <Activity className="w-4 h-4 text-green-400" />
          <span className="text-sm text-green-400">Active</span>
        </div>
      </div>
      
      <div className="space-y-4">
        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-red-400">{anomalies.filter(a => a.isAnomaly && a.severity === 'high').length}</p>
            <p className="text-xs text-gray-400">High</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-yellow-400">{anomalies.filter(a => a.isAnomaly && a.severity === 'medium').length}</p>
            <p className="text-xs text-gray-400">Medium</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-400">{anomalies.filter(a => a.isAnomaly && a.severity === 'low').length}</p>
            <p className="text-xs text-gray-400">Low</p>
          </div>
        </div>
        
        {/* Recent anomalies */}
        {recentAnomalies.length > 0 && (
          <div>
            <p className="text-sm text-gray-300 mb-2">Recent Anomalies</p>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {recentAnomalies.map((anomaly, index) => (
                <div key={index} className={`p-2 rounded-lg border ${getSeverityColor(anomaly.severity)}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs">
                      {new Date(anomaly.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="text-xs font-medium">
                      {anomaly.value.toFixed(1)} kWh
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {recentAnomalies.length === 0 && (
          <div className="text-center py-4">
            <p className="text-gray-400 text-sm">No recent anomalies detected</p>
            <p className="text-green-400 text-xs mt-1">System operating normally</p>
          </div>
        )}
        
        {recentCount > 0 && (
          <div className="mt-4 p-3 bg-orange-900/20 border border-orange-700 rounded-lg">
            <p className="text-orange-400 text-sm">
              ⚠️ {recentCount} anomalies in the last 24 hours
            </p>
          </div>
        )}
      </div>
    </div>
  );
}