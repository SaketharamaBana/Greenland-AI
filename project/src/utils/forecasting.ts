import { EnergyData, ForecastResult } from '../types/energy';

export class EnergyForecaster {
  private weatherApiKey: string | null = null;
  
  constructor(weatherApiKey?: string) {
    this.weatherApiKey = weatherApiKey || null;
  }

  // Enhanced forecasting with multiple algorithms
  forecastNextHour(data: EnergyData[]): ForecastResult {
    if (data.length < 48) {
      throw new Error('Need at least 48 hours of data for accurate forecasting');
    }

    const latest = data[data.length - 1];
    const timestamp = new Date(latest.timestamp);
    const hour = timestamp.getHours();
    const dayOfWeek = timestamp.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    // Multiple forecasting approaches
    const historicalForecast = this.historicalPatternForecast(data);
    const trendForecast = this.trendBasedForecast(data);
    const weatherForecast = this.weatherBasedForecast(data);
    const occupancyForecast = this.occupancyBasedForecast(data, hour, isWeekend);
    
    // Ensemble prediction with weighted average
    const weights = {
      historical: 0.35,
      trend: 0.25,
      weather: 0.25,
      occupancy: 0.15
    };
    
    const nextHourDemand = 
      weights.historical * historicalForecast +
      weights.trend * trendForecast +
      weights.weather * weatherForecast +
      weights.occupancy * occupancyForecast;
    
    // Enhanced solar prediction
    const solarAvailable = this.forecastSolarGeneration(data);
    
    // Dynamic confidence calculation
    const confidence = this.calculateConfidence(data);
    
    return {
      nextHourDemand: Math.max(5, nextHourDemand),
      solarAvailable: Math.max(0, solarAvailable),
      confidence: Math.min(0.98, Math.max(0.65, confidence))
    };
  }

  private historicalPatternForecast(data: EnergyData[]): number {
    const latest = data[data.length - 1];
    const timestamp = new Date(latest.timestamp);
    const hour = timestamp.getHours();
    const dayOfWeek = timestamp.getDay();
    
    // Find similar time periods (same hour, same day of week)
    const similarPeriods = data.filter(d => {
      const dt = new Date(d.timestamp);
      return dt.getHours() === hour && dt.getDay() === dayOfWeek;
    });
    
    if (similarPeriods.length < 3) {
      // Fallback to same hour any day
      const sameHour = data.filter(d => new Date(d.timestamp).getHours() === hour);
      return sameHour.length > 0 ? 
        sameHour.reduce((sum, d) => sum + d.kwh, 0) / sameHour.length : 
        latest.kwh;
    }
    
    // Weighted average with more recent data having higher weight
    let weightedSum = 0;
    let totalWeight = 0;
    
    similarPeriods.slice(-10).forEach((d, index) => {
      const weight = Math.pow(1.1, index); // Exponential weighting
      weightedSum += d.kwh * weight;
      totalWeight += weight;
    });
    
    return weightedSum / totalWeight;
  }

  private trendBasedForecast(data: EnergyData[]): number {
    const recentData = data.slice(-24); // Last 24 hours
    const values = recentData.map(d => d.kwh);
    
    // Simple linear regression for trend
    const n = values.length;
    const x = Array.from({length: n}, (_, i) => i);
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    return intercept + slope * n; // Predict next point
  }

  private weatherBasedForecast(data: EnergyData[]): number {
    const latest = data[data.length - 1];
    const recent = data.slice(-48);
    
    // Find periods with similar weather conditions
    const similarWeather = recent.filter(d => 
      Math.abs(d.temperature - latest.temperature) < 3 &&
      Math.abs(d.irradiance - latest.irradiance) < 100
    );
    
    if (similarWeather.length < 3) {
      return latest.kwh;
    }
    
    return similarWeather.reduce((sum, d) => sum + d.kwh, 0) / similarWeather.length;
  }

  private occupancyBasedForecast(data: EnergyData[], hour: number, isWeekend: boolean): number {
    const latest = data[data.length - 1];
    
    // Predict occupancy for next hour
    let nextOccupancy = 0;
    const nextHour = (hour + 1) % 24;
    
    if (!isWeekend && nextHour >= 7 && nextHour <= 19) {
      nextOccupancy = Math.min(1, 0.1 + 0.9 * Math.sin(Math.PI * (nextHour - 7) / 12));
    } else if (isWeekend && nextHour >= 9 && nextHour <= 17) {
      nextOccupancy = 0.3 + 0.2 * Math.sin(Math.PI * (nextHour - 9) / 8);
    }
    
    // Base load + occupancy effect
    const baseLoad = 25;
    const occupancyEffect = nextOccupancy * 15;
    
    return baseLoad + occupancyEffect;
  }

  private forecastSolarGeneration(data: EnergyData[]): number {
    const latest = data[data.length - 1];
    const timestamp = new Date(latest.timestamp);
    const nextHour = (timestamp.getHours() + 1) % 24;
    
    // No solar generation at night
    if (nextHour < 6 || nextHour > 18) {
      return 0;
    }
    
    // Predict irradiance for next hour based on current conditions and time
    const currentIrradiance = latest.irradiance;
    const timeOfDayFactor = Math.sin(Math.PI * (nextHour - 6) / 12);
    
    // Simple persistence model with time-of-day adjustment
    let predictedIrradiance = currentIrradiance * 0.8 + 
      800 * timeOfDayFactor * 0.2;
    
    // Weather persistence (clouds tend to persist short-term)
    if (currentIrradiance < 200) {
      predictedIrradiance *= 0.7; // Cloudy conditions persist
    }
    
    // Convert to solar generation
    const panelEfficiency = 0.18;
    const panelArea = 100;
    const temperatureDerating = Math.max(0.7, 1 - (latest.temperature - 25) * 0.004);
    
    return (predictedIrradiance / 1000) * panelArea * panelEfficiency * temperatureDerating;
  }

  private calculateConfidence(data: EnergyData[]): number {
    const recent = data.slice(-48);
    const values = recent.map(d => d.kwh);
    
    // Calculate prediction stability metrics
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const coefficientOfVariation = Math.sqrt(variance) / mean;
    
    // Data quality metrics
    const dataCompleteness = recent.length / 48;
    const recentVariability = this.calculateRecentVariability(recent);
    
    // Weather consistency
    const weatherConsistency = this.calculateWeatherConsistency(recent);
    
    // Combine metrics into confidence score
    const stabilityScore = Math.max(0, 1 - coefficientOfVariation);
    const qualityScore = dataCompleteness;
    const consistencyScore = 1 - recentVariability / 100;
    const weatherScore = weatherConsistency;
    
    return (stabilityScore * 0.3 + qualityScore * 0.2 + consistencyScore * 0.3 + weatherScore * 0.2);
  }

  private calculateRecentVariability(data: EnergyData[]): number {
    if (data.length < 2) return 0;
    
    const values = data.map(d => d.kwh);
    const changes = [];
    
    for (let i = 1; i < values.length; i++) {
      changes.push(Math.abs(values[i] - values[i-1]));
    }
    
    return changes.reduce((sum, change) => sum + change, 0) / changes.length;
  }

  private calculateWeatherConsistency(data: EnergyData[]): number {
    if (data.length < 6) return 0.5;
    
    const recent6 = data.slice(-6);
    const tempChanges = [];
    const irradianceChanges = [];
    
    for (let i = 1; i < recent6.length; i++) {
      tempChanges.push(Math.abs(recent6[i].temperature - recent6[i-1].temperature));
      irradianceChanges.push(Math.abs(recent6[i].irradiance - recent6[i-1].irradiance));
    }
    
    const avgTempChange = tempChanges.reduce((sum, c) => sum + c, 0) / tempChanges.length;
    const avgIrradianceChange = irradianceChanges.reduce((sum, c) => sum + c, 0) / irradianceChanges.length;
    
    // Lower changes = higher consistency
    const tempConsistency = Math.max(0, 1 - avgTempChange / 10);
    const irradianceConsistency = Math.max(0, 1 - avgIrradianceChange / 500);
    
    return (tempConsistency + irradianceConsistency) / 2;
  }
}