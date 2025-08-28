export interface EnergyData {
  timestamp: string;
  kwh: number;
  temperature: number;
  irradiance: number;
  windSpeed: number;
  occupancy: number;
  solarGeneration?: number;
}

export interface ForecastResult {
  nextHourDemand: number;
  solarAvailable: number;
  confidence: number;
  forecastHorizon?: number;
  uncertaintyBand?: { lower: number; upper: number };
}

export interface OptimizationResult {
  gridKwh: number;
  solarKwh: number;
  batteryKwh?: number;
  batteryCharge?: number;
  batteryLevel?: number;
  excessSolar?: number;
  totalCost: number;
  carbonSaved: number;
  renewablePercentage: number;
  peakDemandReduction?: number;
  gridStressReduction?: number;
  timeOfUse?: 'peak' | 'off-peak' | 'mid-peak';
  adjustedGridPrice?: number;
}

export interface AnomalyData {
  timestamp: string;
  value: number;
  isAnomaly: boolean;
  severity: 'low' | 'medium' | 'high';
  type?: 'spike' | 'drop' | 'sustained' | 'pattern';
  confidence?: number;
}

export interface WeatherData {
  temperature: number;
  humidity: number;
  irradiance: number;
  windSpeed: number;
  cloudCover: number;
  forecast?: {
    nextHour: {
      temperature: number;
      irradiance: number;
      windSpeed: number;
    };
  };
}

export interface BuildingMetrics {
  totalConsumption: number;
  peakDemand: number;
  loadFactor: number;
  energyIntensity: number;
  carbonFootprint: number;
  costPerKwh: number;
  renewablePercentage: number;
  batteryUtilization?: number;
}

export interface RealTimePricing {
  currentPrice: number;
  averagePrice: number;
  peakPrice: number;
  offPeakPrice: number;
  timeOfUse: 'peak' | 'off-peak' | 'mid-peak';
  nextPeriodPrice?: number;
}