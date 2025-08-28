import React, { useState, useEffect } from 'react';
import { Activity, Zap, Sun, TrendingUp, Leaf, DollarSign, Battery, AlertTriangle } from 'lucide-react';
import { EnergyDataGenerator } from './utils/dataGenerator';
import { EnergyForecaster } from './utils/forecasting';
import { EnergyOptimizer } from './utils/optimization';
import { AnomalyDetector } from './utils/anomalyDetection';
import { MetricCard } from './components/MetricCard';
import { EnergyChart } from './components/EnergyChart';
import { EnergyMixChart } from './components/EnergyMixChart';
import { ControlPanel } from './components/ControlPanel';
import { AnomalyAlert } from './components/AnomalyAlert';
import { EnergyData, ForecastResult, OptimizationResult, AnomalyData } from './types/energy';

function App() {
  const [energyData, setEnergyData] = useState<EnergyData[]>([]);
  const [forecast, setForecast] = useState<ForecastResult | null>(null);
  const [optimization, setOptimization] = useState<OptimizationResult | null>(null);
  const [anomalies, setAnomalies] = useState<AnomalyData[]>([]);
  const [gridPrice, setGridPrice] = useState(0.12);
  const [isLiveMode, setIsLiveMode] = useState(true);
  const [timeOfUse, setTimeOfUse] = useState<'peak' | 'off-peak' | 'mid-peak'>('mid-peak');
  const [batteryLevel, setBatteryLevel] = useState(25);
  const [systemAlerts, setSystemAlerts] = useState<string[]>([]);
  
  // Initialize utilities
  const dataGenerator = new EnergyDataGenerator();
  const forecaster = new EnergyForecaster();
  const optimizer = new EnergyOptimizer(50, 0.95); // 50kWh battery, 95% efficiency
  const anomalyDetector = new AnomalyDetector('medium');

  // Initialize data with realistic patterns
  useEffect(() => {
    const initialData = dataGenerator.generateSyntheticData(14); // 2 weeks of data
    const dataWithAnomalies = dataGenerator.generateAnomalousData(initialData, 0.03);
    setEnergyData(dataWithAnomalies);
    
    if (dataWithAnomalies.length > 48) {
      const forecastResult = forecaster.forecastNextHour(dataWithAnomalies);
      setForecast(forecastResult);
      
      const optimizationResult = optimizer.optimize(
        forecastResult.nextHourDemand,
        forecastResult.solarAvailable,
        gridPrice,
        batteryLevel,
        timeOfUse
      );
      setOptimization(optimizationResult);
      
      const anomalyResults = anomalyDetector.detectAnomalies(dataWithAnomalies);
      setAnomalies(anomalyResults);
    }
  }, []);

  // Enhanced live data updates with realistic patterns
  useEffect(() => {
    if (!isLiveMode) return;
    
    const interval = setInterval(() => {
      setEnergyData(prevData => {
        const lastTimestamp = new Date(prevData[prevData.length - 1].timestamp);
        const newTimestamp = new Date(lastTimestamp.getTime() + 60 * 60 * 1000);
        
        // Generate realistic new data point
        const hour = newTimestamp.getHours();
        const dayOfWeek = newTimestamp.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isBusinessHour = hour >= 8 && hour <= 18 && !isWeekend;
        
        // More sophisticated load calculation
        let baseLoad = 25;
        if (isWeekend) {
          baseLoad += 8 + 4 * Math.sin(2 * Math.PI * (hour - 10) / 24);
        } else {
          baseLoad += 15 + 8 * Math.sin(2 * Math.PI * (hour - 6) / 24);
          if (isBusinessHour) baseLoad += 12;
          if (hour >= 7 && hour <= 9) baseLoad += 5; // Morning peak
          if (hour >= 17 && hour <= 19) baseLoad += 7; // Evening peak
        }
        
        // Weather simulation with persistence
        const lastData = prevData[prevData.length - 1];
        const temperature = lastData.temperature + (Math.random() - 0.5) * 2;
        const irradiance = Math.max(0, 1000 * Math.sin(Math.PI * (hour - 6) / 12)) * (0.7 + Math.random() * 0.6);
        const windSpeed = Math.max(0, lastData.windSpeed + (Math.random() - 0.5) * 1);
        
        // Occupancy patterns
        let occupancy = 0;
        if (!isWeekend && hour >= 7 && hour <= 19) {
          occupancy = Math.min(1, 0.1 + 0.9 * Math.sin(Math.PI * (hour - 7) / 12));
        } else if (isWeekend && hour >= 9 && hour <= 17) {
          occupancy = 0.3 + 0.2 * Math.sin(Math.PI * (hour - 9) / 8);
        }
        
        // HVAC and equipment loads
        const hvacLoad = Math.abs(temperature - 22) * 0.8 * occupancy;
        const equipmentLoad = occupancy * 8;
        const randomNoise = (Math.random() - 0.5) * 3;
        
        const kwh = Math.max(8, baseLoad + hvacLoad + equipmentLoad + randomNoise);
        
        // Solar generation with realistic efficiency
        const panelEfficiency = 0.18;
        const panelArea = 100;
        const temperatureDerating = Math.max(0.7, 1 - (temperature - 25) * 0.004);
        const solarGeneration = (irradiance / 1000) * panelArea * panelEfficiency * temperatureDerating;
        
        const newDataPoint: EnergyData = {
          timestamp: newTimestamp.toISOString(),
          kwh: Math.round(kwh * 100) / 100,
          temperature: Math.round(temperature * 10) / 10,
          irradiance: Math.round(irradiance),
          windSpeed: Math.round(windSpeed * 10) / 10,
          occupancy: Math.round(occupancy * 100) / 100,
          solarGeneration: Math.max(0, Math.round(solarGeneration * 100) / 100)
        };
        
        const updatedData = [...prevData, newDataPoint].slice(-336); // Keep last 2 weeks
        
        // Update forecasts and optimization
        if (updatedData.length > 48) {
          const forecastResult = forecaster.forecastNextHour(updatedData);
          setForecast(forecastResult);
          
          const optimizationResult = optimizer.optimize(
            forecastResult.nextHourDemand,
            forecastResult.solarAvailable,
            gridPrice,
            batteryLevel,
            timeOfUse
          );
          setOptimization(optimizationResult);
          
          // Update battery level based on optimization
          if (optimizationResult.batteryKwh && optimizationResult.batteryCharge) {
            setBatteryLevel(prev => Math.max(0, Math.min(50, 
              prev - optimizationResult.batteryKwh! + optimizationResult.batteryCharge!
            )));
          }
          
          const anomalyResults = anomalyDetector.detectAnomalies(updatedData);
          setAnomalies(anomalyResults);
          
          // Generate system alerts
          updateSystemAlerts(forecastResult, optimizationResult, anomalyResults);
        }
        
        return updatedData;
      });
    }, 3000); // Update every 3 seconds for more realistic feel
    
    return () => clearInterval(interval);
  }, [isLiveMode, gridPrice, timeOfUse, batteryLevel]);

  // Update optimization when parameters change
  useEffect(() => {
    if (forecast) {
      const optimizationResult = optimizer.optimize(
        forecast.nextHourDemand,
        forecast.solarAvailable,
        gridPrice,
        batteryLevel,
        timeOfUse
      );
      setOptimization(optimizationResult);
    }
  }, [gridPrice, timeOfUse, batteryLevel, forecast]);

  const updateSystemAlerts = (
    forecastResult: ForecastResult,
    optimizationResult: OptimizationResult,
    anomalyResults: AnomalyData[]
  ) => {
    const alerts: string[] = [];
    
    // High demand alert
    if (forecastResult.nextHourDemand > 60) {
      alerts.push('High demand forecast - consider load shifting');
    }
    
    // Low confidence alert
    if (forecastResult.confidence < 0.7) {
      alerts.push('Low forecast confidence - weather conditions changing');
    }
    
    // Battery alerts
    if (batteryLevel < 10) {
      alerts.push('Battery level critically low');
    } else if (batteryLevel > 45 && optimizationResult.excessSolar! > 5) {
      alerts.push('Battery full - excess solar available for grid export');
    }
    
    // Peak pricing alert
    if (timeOfUse === 'peak' && optimizationResult.gridKwh! > 20) {
      alerts.push('High grid usage during peak hours - consider battery discharge');
    }
    
    // Anomaly alerts
    const recentAnomalies = anomalyResults.filter(a => {
      const anomalyTime = new Date(a.timestamp);
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      return a.isAnomaly && a.severity === 'high' && anomalyTime > hourAgo;
    });
    
    if (recentAnomalies.length > 0) {
      alerts.push(`${recentAnomalies.length} high-severity anomalies detected`);
    }
    
    setSystemAlerts(alerts);
  };

  const currentConsumption = energyData.length > 0 ? energyData[energyData.length - 1].kwh : 0;
  const currentSolar = energyData.length > 0 ? energyData[energyData.length - 1].solarGeneration || 0 : 0;
  const recentAnomalies = anomalies.filter(a => {
    const anomalyTime = new Date(a.timestamp);
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return a.isAnomaly && anomalyTime > dayAgo;
  });

  // Calculate additional metrics
  const totalSolarToday = energyData.slice(-24).reduce((sum, d) => sum + (d.solarGeneration || 0), 0);
  const avgEfficiency = energyData.length > 0 ? 
    (totalSolarToday / energyData.slice(-24).reduce((sum, d) => sum + d.kwh, 0)) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Enhanced Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-green-400 to-green-600 rounded-lg">
                <Leaf className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">GreenLoad AI</h1>
                <p className="text-gray-300 text-sm">Smart Energy Management System</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* System Alerts */}
              {systemAlerts.length > 0 && (
                <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-orange-900/50 text-orange-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm font-medium">{systemAlerts.length} Alert{systemAlerts.length > 1 ? 's' : ''}</span>
                </div>
              )}
              
              {/* Live Status */}
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${isLiveMode ? 'bg-green-900/50 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
                <Activity className="w-4 h-4" />
                <span className="text-sm font-medium">{isLiveMode ? 'LIVE' : 'STATIC'}</span>
              </div>
              
              {/* Time of Use Indicator */}
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${
                timeOfUse === 'peak' ? 'bg-red-900/50 text-red-400' :
                timeOfUse === 'mid-peak' ? 'bg-yellow-900/50 text-yellow-400' :
                'bg-green-900/50 text-green-400'
              }`}>
                <span className="text-sm font-medium">{timeOfUse.toUpperCase().replace('-', ' ')}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* System Alerts Banner */}
        {systemAlerts.length > 0 && (
          <div className="mb-6 p-4 bg-orange-900/20 border border-orange-700 rounded-xl">
            <div className="flex items-center space-x-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
              <h3 className="text-orange-400 font-semibold">System Alerts</h3>
            </div>
            <div className="space-y-1">
              {systemAlerts.map((alert, index) => (
                <p key={index} className="text-orange-300 text-sm">• {alert}</p>
              ))}
            </div>
          </div>
        )}

        {/* Enhanced Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Current Demand"
            value={`${currentConsumption.toFixed(1)}`}
            subValue="kWh"
            icon={Zap}
            color="bg-blue-500"
            trend={currentConsumption > 40 ? "up" : currentConsumption < 25 ? "down" : "stable"}
            trendValue={currentConsumption > 40 ? "High load" : currentConsumption < 25 ? "Low load" : "Normal"}
          />
          <MetricCard
            title="Next Hour Forecast"
            value={forecast ? `${forecast.nextHourDemand.toFixed(1)}` : '---'}
            subValue={forecast ? `${(forecast.confidence * 100).toFixed(0)}% confidence` : 'Loading...'}
            icon={TrendingUp}
            color="bg-purple-500"
            trend="up"
            trendValue={forecast && forecast.nextHourDemand > currentConsumption ? "Increasing" : "Stable"}
          />
          <MetricCard
            title="Solar Generation"
            value={`${currentSolar.toFixed(1)}`}
            subValue={forecast ? `${forecast.solarAvailable.toFixed(1)} kWh next hour` : 'Calculating...'}
            icon={Sun}
            color="bg-yellow-500"
            trend={currentSolar > 5 ? "up" : "down"}
            trendValue={currentSolar > 5 ? "Generating" : "Night/Cloudy"}
          />
          <MetricCard
            title="Battery Status"
            value={`${batteryLevel.toFixed(0)}`}
            subValue={`kWh (${((batteryLevel / 50) * 100).toFixed(0)}%)`}
            icon={Battery}
            color={batteryLevel > 30 ? "bg-green-500" : batteryLevel > 15 ? "bg-yellow-500" : "bg-red-500"}
            trend={batteryLevel > 30 ? "up" : batteryLevel < 15 ? "down" : "stable"}
            trendValue={batteryLevel > 30 ? "Good" : batteryLevel < 15 ? "Low" : "Fair"}
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <EnergyChart data={energyData.slice(-72)} />
          {optimization && <EnergyMixChart optimization={optimization} />}
        </div>

        {/* Control Panel and Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <ControlPanel
            gridPrice={gridPrice}
            onGridPriceChange={setGridPrice}
            isLiveMode={isLiveMode}
            onLiveModeChange={setIsLiveMode}
            timeOfUse={timeOfUse}
            onTimeOfUseChange={setTimeOfUse}
            batteryLevel={batteryLevel}
            onBatteryLevelChange={setBatteryLevel}
          />
          <AnomalyAlert
            anomalies={anomalies}
            recentCount={recentAnomalies.length}
          />
        </div>

        {/* Enhanced Footer Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="text-2xl font-bold text-green-400 mb-2">
              {optimization ? `${optimization.carbonSaved.toFixed(1)}` : '0.0'}
            </div>
            <div className="text-gray-300 text-sm">kg CO₂ Saved Today</div>
            <div className="text-xs text-green-400 mt-1">
              Equivalent to {optimization ? (optimization.carbonSaved * 2.3).toFixed(0) : '0'} miles not driven
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="text-2xl font-bold text-blue-400 mb-2">
              {totalSolarToday.toFixed(1)}
            </div>
            <div className="text-gray-300 text-sm">Solar Generated Today (kWh)</div>
            <div className="text-xs text-blue-400 mt-1">
              ${(totalSolarToday * gridPrice).toFixed(2)} value generated
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="text-2xl font-bold text-purple-400 mb-2">
              {forecast ? `${(forecast.confidence * 100).toFixed(0)}%` : '0%'}
            </div>
            <div className="text-gray-300 text-sm">AI Prediction Accuracy</div>
            <div className="text-xs text-purple-400 mt-1">
              Based on {energyData.length} data points
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="text-2xl font-bold text-yellow-400 mb-2">
              {optimization ? `${optimization.renewablePercentage.toFixed(0)}%` : '0%'}
            </div>
            <div className="text-gray-300 text-sm">Renewable Energy Mix</div>
            <div className="text-xs text-yellow-400 mt-1">
              Target: 80% by 2030
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;