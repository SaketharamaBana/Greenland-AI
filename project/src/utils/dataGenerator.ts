import { EnergyData } from '../types/energy';

export class EnergyDataGenerator {
  private seed: number;
  private weatherPatterns: any;
  
  constructor(seed: number = 42) {
    this.seed = seed;
    this.initializeWeatherPatterns();
  }

  private initializeWeatherPatterns() {
    // Simulate realistic weather patterns for different seasons
    this.weatherPatterns = {
      spring: { baseTemp: 15, tempVariation: 8, cloudiness: 0.4 },
      summer: { baseTemp: 25, tempVariation: 6, cloudiness: 0.2 },
      fall: { baseTemp: 12, tempVariation: 10, cloudiness: 0.6 },
      winter: { baseTemp: 2, tempVariation: 12, cloudiness: 0.7 }
    };
  }

  // Improved seeded random number generator
  private random(): number {
    const x = Math.sin(this.seed++) * 10000;
    return x - Math.floor(x);
  }

  private getSeason(dayOfYear: number): string {
    if (dayOfYear < 80 || dayOfYear > 355) return 'winter';
    if (dayOfYear < 172) return 'spring';
    if (dayOfYear < 266) return 'summer';
    return 'fall';
  }

  generateSyntheticData(days: number = 7, hoursInterval: number = 1): EnergyData[] {
    const data: EnergyData[] = [];
    const now = new Date();
    const startTime = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    for (let i = 0; i < days * 24 / hoursInterval; i++) {
      const timestamp = new Date(startTime.getTime() + i * hoursInterval * 60 * 60 * 1000);
      const hour = timestamp.getHours();
      const dayOfWeek = timestamp.getDay();
      const dayOfYear = Math.floor((timestamp.getTime() - new Date(timestamp.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
      const season = this.getSeason(dayOfYear);
      const weather = this.weatherPatterns[season];
      
      // More realistic base load patterns
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isBusinessHour = hour >= 8 && hour <= 18 && !isWeekend;
      
      // Complex load pattern with multiple factors
      let baseLoad = 25; // Minimum building load
      
      // Daily pattern - different for weekdays vs weekends
      if (isWeekend) {
        baseLoad += 8 + 4 * Math.sin(2 * Math.PI * (hour - 10) / 24);
      } else {
        // Weekday pattern with morning and evening peaks
        baseLoad += 15 + 8 * Math.sin(2 * Math.PI * (hour - 6) / 24);
        if (isBusinessHour) {
          baseLoad += 12; // Business hours boost
        }
        // Morning and evening peaks
        if (hour >= 7 && hour <= 9) baseLoad += 5;
        if (hour >= 17 && hour <= 19) baseLoad += 7;
      }
      
      // Seasonal adjustment
      const seasonalMultiplier = season === 'summer' ? 1.3 : season === 'winter' ? 1.4 : 1.0;
      baseLoad *= seasonalMultiplier;
      
      // Weather conditions with seasonal patterns
      const temperature = weather.baseTemp + 
        weather.tempVariation * Math.sin(2 * Math.PI * (hour - 6) / 24) + 
        (this.random() - 0.5) * 6;
      
      // More realistic irradiance with cloud cover
      const cloudCover = weather.cloudiness + (this.random() - 0.5) * 0.3;
      const clearSkyIrradiance = Math.max(0, 1000 * Math.sin(Math.PI * (hour - 6) / 12));
      const irradiance = clearSkyIrradiance * Math.max(0, 1 - cloudCover);
      
      // Wind speed with realistic patterns
      const windSpeed = Math.max(0, 3 + (this.random() - 0.5) * 4 + Math.sin(2 * Math.PI * hour / 24));
      
      // Occupancy patterns
      let occupancy = 0;
      if (!isWeekend && hour >= 7 && hour <= 19) {
        occupancy = Math.min(1, 0.1 + 0.9 * Math.sin(Math.PI * (hour - 7) / 12));
      } else if (isWeekend && hour >= 9 && hour <= 17) {
        occupancy = 0.3 + 0.2 * Math.sin(Math.PI * (hour - 9) / 8);
      }
      
      // HVAC load based on temperature deviation from comfort zone
      const comfortTemp = 22;
      const hvacLoad = Math.abs(temperature - comfortTemp) * 0.8 * occupancy;
      
      // Equipment and lighting load
      const equipmentLoad = occupancy * 8;
      
      // Random variations and equipment cycling
      const equipmentCycling = 2 * Math.sin(2 * Math.PI * i / 6) * (this.random() > 0.7 ? 1 : 0);
      const randomNoise = (this.random() - 0.5) * 3;
      
      // Total consumption
      const kwh = Math.max(8, baseLoad + hvacLoad + equipmentLoad + equipmentCycling + randomNoise);
      
      // Solar generation with realistic efficiency curves
      const panelEfficiency = 0.18; // 18% efficiency
      const panelArea = 100; // 100 m² of panels
      const temperatureDerating = Math.max(0.7, 1 - (temperature - 25) * 0.004);
      const solarGeneration = (irradiance / 1000) * panelArea * panelEfficiency * temperatureDerating;
      
      data.push({
        timestamp: timestamp.toISOString(),
        kwh: Math.round(kwh * 100) / 100,
        temperature: Math.round(temperature * 10) / 10,
        irradiance: Math.round(irradiance),
        windSpeed: Math.round(windSpeed * 10) / 10,
        occupancy: Math.round(occupancy * 100) / 100,
        solarGeneration: Math.max(0, Math.round(solarGeneration * 100) / 100)
      });
    }
    
    return data;
  }

  // Generate realistic anomalies
  generateAnomalousData(baseData: EnergyData[], anomalyRate: number = 0.05): EnergyData[] {
    const data = [...baseData];
    const anomalyCount = Math.floor(data.length * anomalyRate);
    
    for (let i = 0; i < anomalyCount; i++) {
      const randomIndex = Math.floor(this.random() * data.length);
      const anomalyType = this.random();
      
      if (anomalyType < 0.4) {
        // Equipment failure - sudden drop
        data[randomIndex].kwh *= 0.3;
      } else if (anomalyType < 0.7) {
        // Equipment malfunction - spike
        data[randomIndex].kwh *= 2.5;
      } else {
        // HVAC system stuck - sustained high load
        for (let j = 0; j < 3 && randomIndex + j < data.length; j++) {
          data[randomIndex + j].kwh *= 1.8;
        }
      }
    }
    
    return data;
  }
}