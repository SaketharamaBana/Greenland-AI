import { EnergyData, AnomalyData } from '../types/energy';

export class AnomalyDetector {
  private sensitivityLevel: 'low' | 'medium' | 'high';
  private historicalBaseline: Map<string, number>;
  
  constructor(sensitivityLevel: 'low' | 'medium' | 'high' = 'medium') {
    this.sensitivityLevel = sensitivityLevel;
    this.historicalBaseline = new Map();
  }

  detectAnomalies(data: EnergyData[], windowSize: number = 48): AnomalyData[] {
    const anomalies: AnomalyData[] = [];
    
    // Build historical baseline patterns
    this.buildHistoricalBaseline(data);
    
    for (let i = Math.max(windowSize, 24); i < data.length; i++) {
      const current = data[i];
      const window = data.slice(i - windowSize, i);
      
      // Multiple anomaly detection methods
      const statisticalAnomaly = this.detectStatisticalAnomaly(current, window);
      const patternAnomaly = this.detectPatternAnomaly(current, data, i);
      const contextualAnomaly = this.detectContextualAnomaly(current, window);
      const equipmentAnomaly = this.detectEquipmentAnomaly(current, data.slice(Math.max(0, i - 6), i));
      
      // Combine detection results
      const anomalyResults = [statisticalAnomaly, patternAnomaly, contextualAnomaly, equipmentAnomaly];
      const detectedAnomalies = anomalyResults.filter(a => a.isAnomaly);
      
      if (detectedAnomalies.length > 0) {
        // Take the most severe anomaly
        const mostSevere = detectedAnomalies.reduce((prev, curr) => 
          this.getSeverityScore(curr.severity) > this.getSeverityScore(prev.severity) ? curr : prev
        );
        
        anomalies.push({
          timestamp: current.timestamp,
          value: current.kwh,
          isAnomaly: true,
          severity: mostSevere.severity,
          type: mostSevere.type,
          confidence: this.calculateAnomalyConfidence(detectedAnomalies)
        });
      } else {
        anomalies.push({
          timestamp: current.timestamp,
          value: current.kwh,
          isAnomaly: false,
          severity: 'low',
          confidence: 0.95
        });
      }
    }
    
    return anomalies;
  }

  private buildHistoricalBaseline(data: EnergyData[]): void {
    // Build baseline patterns for each hour of each day of week
    const patterns: { [key: string]: number[] } = {};
    
    data.forEach(d => {
      const dt = new Date(d.timestamp);
      const key = `${dt.getDay()}-${dt.getHours()}`;
      
      if (!patterns[key]) {
        patterns[key] = [];
      }
      patterns[key].push(d.kwh);
    });
    
    // Calculate median for each pattern
    Object.keys(patterns).forEach(key => {
      const values = patterns[key].sort((a, b) => a - b);
      const median = values[Math.floor(values.length / 2)];
      this.historicalBaseline.set(key, median);
    });
  }

  private detectStatisticalAnomaly(current: EnergyData, window: EnergyData[]): AnomalyData {
    const values = window.map(d => d.kwh);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    const zScore = Math.abs((current.kwh - mean) / (stdDev + 0.001));
    
    const thresholds = {
      low: { high: 2.0, medium: 2.5, low: 3.0 },
      medium: { high: 1.8, medium: 2.2, low: 2.8 },
      high: { high: 1.5, medium: 2.0, low: 2.5 }
    };
    
    const threshold = thresholds[this.sensitivityLevel];
    
    let severity: 'low' | 'medium' | 'high' = 'low';
    let isAnomaly = false;
    
    if (zScore > threshold.high) {
      isAnomaly = true;
      severity = 'high';
    } else if (zScore > threshold.medium) {
      isAnomaly = true;
      severity = 'medium';
    } else if (zScore > threshold.low) {
      isAnomaly = true;
      severity = 'low';
    }
    
    return {
      timestamp: current.timestamp,
      value: current.kwh,
      isAnomaly,
      severity,
      type: current.kwh > mean ? 'spike' : 'drop'
    };
  }

  private detectPatternAnomaly(current: EnergyData, allData: EnergyData[], currentIndex: number): AnomalyData {
    const dt = new Date(current.timestamp);
    const key = `${dt.getDay()}-${dt.getHours()}`;
    const expectedValue = this.historicalBaseline.get(key);
    
    if (!expectedValue) {
      return {
        timestamp: current.timestamp,
        value: current.kwh,
        isAnomaly: false,
        severity: 'low'
      };
    }
    
    const deviation = Math.abs(current.kwh - expectedValue) / expectedValue;
    
    let severity: 'low' | 'medium' | 'high' = 'low';
    let isAnomaly = false;
    
    if (deviation > 0.5) {
      isAnomaly = true;
      severity = 'high';
    } else if (deviation > 0.3) {
      isAnomaly = true;
      severity = 'medium';
    } else if (deviation > 0.2) {
      isAnomaly = true;
      severity = 'low';
    }
    
    return {
      timestamp: current.timestamp,
      value: current.kwh,
      isAnomaly,
      severity,
      type: 'pattern'
    };
  }

  private detectContextualAnomaly(current: EnergyData, window: EnergyData[]): AnomalyData {
    // Check if consumption is unusual given the context (weather, occupancy)
    const dt = new Date(current.timestamp);
    const hour = dt.getHours();
    const isBusinessHour = hour >= 8 && hour <= 18;
    
    // Find similar contextual conditions
    const similarConditions = window.filter(d => {
      const ddt = new Date(d.timestamp);
      const dhour = ddt.getHours();
      const disBusinessHour = dhour >= 8 && dhour <= 18;
      
      return Math.abs(d.temperature - current.temperature) < 5 &&
             Math.abs(d.occupancy - current.occupancy) < 0.2 &&
             isBusinessHour === disBusinessHour;
    });
    
    if (similarConditions.length < 3) {
      return {
        timestamp: current.timestamp,
        value: current.kwh,
        isAnomaly: false,
        severity: 'low'
      };
    }
    
    const expectedRange = this.calculateExpectedRange(similarConditions);
    const isOutsideRange = current.kwh < expectedRange.min || current.kwh > expectedRange.max;
    
    let severity: 'low' | 'medium' | 'high' = 'low';
    if (isOutsideRange) {
      const deviation = Math.min(
        Math.abs(current.kwh - expectedRange.min) / expectedRange.min,
        Math.abs(current.kwh - expectedRange.max) / expectedRange.max
      );
      
      if (deviation > 0.4) severity = 'high';
      else if (deviation > 0.25) severity = 'medium';
      else severity = 'low';
    }
    
    return {
      timestamp: current.timestamp,
      value: current.kwh,
      isAnomaly: isOutsideRange,
      severity,
      type: 'pattern'
    };
  }

  private detectEquipmentAnomaly(current: EnergyData, recentData: EnergyData[]): AnomalyData {
    if (recentData.length < 3) {
      return {
        timestamp: current.timestamp,
        value: current.kwh,
        isAnomaly: false,
        severity: 'low'
      };
    }
    
    const recentValues = recentData.map(d => d.kwh);
    const currentValue = current.kwh;
    
    // Check for sudden equipment failure (sudden drop)
    const avgRecent = recentValues.reduce((sum, v) => sum + v, 0) / recentValues.length;
    const dropThreshold = avgRecent * 0.4; // 60% drop
    
    if (currentValue < dropThreshold) {
      return {
        timestamp: current.timestamp,
        value: current.kwh,
        isAnomaly: true,
        severity: 'high',
        type: 'drop'
      };
    }
    
    // Check for equipment malfunction (sudden spike)
    const spikeThreshold = avgRecent * 2.0; // 100% increase
    
    if (currentValue > spikeThreshold) {
      return {
        timestamp: current.timestamp,
        value: current.kwh,
        isAnomaly: true,
        severity: 'high',
        type: 'spike'
      };
    }
    
    // Check for sustained unusual behavior
    const allHigh = recentValues.concat([currentValue]).every(v => v > avgRecent * 1.3);
    const allLow = recentValues.concat([currentValue]).every(v => v < avgRecent * 0.7);
    
    if (allHigh || allLow) {
      return {
        timestamp: current.timestamp,
        value: current.kwh,
        isAnomaly: true,
        severity: 'medium',
        type: 'sustained'
      };
    }
    
    return {
      timestamp: current.timestamp,
      value: current.kwh,
      isAnomaly: false,
      severity: 'low'
    };
  }

  private calculateExpectedRange(data: EnergyData[]): { min: number; max: number } {
    const values = data.map(d => d.kwh).sort((a, b) => a - b);
    const q1 = values[Math.floor(values.length * 0.25)];
    const q3 = values[Math.floor(values.length * 0.75)];
    const iqr = q3 - q1;
    
    return {
      min: q1 - 1.5 * iqr,
      max: q3 + 1.5 * iqr
    };
  }

  private getSeverityScore(severity: 'low' | 'medium' | 'high'): number {
    switch (severity) {
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 0;
    }
  }

  private calculateAnomalyConfidence(anomalies: AnomalyData[]): number {
    if (anomalies.length === 0) return 0;
    
    const severityScores = anomalies.map(a => this.getSeverityScore(a.severity));
    const avgSeverity = severityScores.reduce((sum, s) => sum + s, 0) / severityScores.length;
    const agreementFactor = anomalies.length / 4; // Max 4 detection methods
    
    return Math.min(0.98, 0.5 + (avgSeverity / 3) * 0.3 + agreementFactor * 0.2);
  }

  getAnomalyStats(anomalies: AnomalyData[]) {
    const recentAnomalies = anomalies.filter(a => a.isAnomaly);
    const total = recentAnomalies.length;
    const high = recentAnomalies.filter(a => a.severity === 'high').length;
    const medium = recentAnomalies.filter(a => a.severity === 'medium').length;
    const low = recentAnomalies.filter(a => a.severity === 'low').length;
    
    // Anomaly types
    const spikes = recentAnomalies.filter(a => a.type === 'spike').length;
    const drops = recentAnomalies.filter(a => a.type === 'drop').length;
    const sustained = recentAnomalies.filter(a => a.type === 'sustained').length;
    const patterns = recentAnomalies.filter(a => a.type === 'pattern').length;
    
    return { 
      total, 
      high, 
      medium, 
      low,
      types: { spikes, drops, sustained, patterns }
    };
  }
}