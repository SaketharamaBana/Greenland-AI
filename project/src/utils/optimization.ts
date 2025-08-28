import { OptimizationResult } from '../types/energy';

export class EnergyOptimizer {
  private batteryCapacity: number;
  private batteryEfficiency: number;
  private gridCarbonIntensity: number;
  
  constructor(batteryCapacity: number = 50, batteryEfficiency: number = 0.95) {
    this.batteryCapacity = batteryCapacity;
    this.batteryEfficiency = batteryEfficiency;
    this.gridCarbonIntensity = 0.8; // kg CO2 per kWh
  }

  optimize(
    demandKwh: number, 
    solarAvailableKwh: number, 
    gridPrice: number = 0.12,
    batteryLevel: number = 25,
    timeOfUse: 'peak' | 'off-peak' | 'mid-peak' = 'mid-peak'
  ): OptimizationResult {
    // Time-of-use pricing
    const priceMultipliers = {
      'peak': 1.8,
      'mid-peak': 1.0,
      'off-peak': 0.6
    };
    
    const adjustedGridPrice = gridPrice * priceMultipliers[timeOfUse];
    
    // Advanced optimization considering battery storage
    let solarKwh = 0;
    let gridKwh = 0;
    let batteryDischarge = 0;
    let batteryCharge = 0;
    let excessSolar = 0;
    
    // Step 1: Use available solar first
    solarKwh = Math.min(solarAvailableKwh, demandKwh);
    let remainingDemand = demandKwh - solarKwh;
    
    // Step 2: Handle excess solar
    excessSolar = solarAvailableKwh - solarKwh;
    if (excessSolar > 0) {
      // Charge battery with excess solar
      const maxCharge = this.batteryCapacity - batteryLevel;
      batteryCharge = Math.min(excessSolar, maxCharge) * this.batteryEfficiency;
      excessSolar -= batteryCharge / this.batteryEfficiency;
    }
    
    // Step 3: Use battery if economical
    if (remainingDemand > 0 && batteryLevel > 0) {
      // Use battery during peak hours or when grid price is high
      if (timeOfUse === 'peak' || adjustedGridPrice > 0.15) {
        batteryDischarge = Math.min(remainingDemand, batteryLevel);
        remainingDemand -= batteryDischarge;
      }
    }
    
    // Step 4: Use grid for remaining demand
    gridKwh = remainingDemand;
    
    // Calculate costs and benefits
    const totalCost = gridKwh * adjustedGridPrice;
    const carbonSaved = (solarKwh + batteryDischarge) * this.gridCarbonIntensity;
    const renewablePercentage = demandKwh > 0 ? 
      ((solarKwh + batteryDischarge) / demandKwh) * 100 : 0;
    
    // Calculate additional metrics
    const peakDemandReduction = this.calculatePeakReduction(demandKwh, solarKwh, batteryDischarge);
    const gridStressReduction = this.calculateGridStressReduction(gridKwh, demandKwh);
    
    return {
      gridKwh: Math.round(gridKwh * 100) / 100,
      solarKwh: Math.round(solarKwh * 100) / 100,
      batteryKwh: Math.round(batteryDischarge * 100) / 100,
      batteryCharge: Math.round(batteryCharge * 100) / 100,
      excessSolar: Math.round(excessSolar * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      carbonSaved: Math.round(carbonSaved * 100) / 100,
      renewablePercentage: Math.round(renewablePercentage * 10) / 10,
      peakDemandReduction: Math.round(peakDemandReduction * 10) / 10,
      gridStressReduction: Math.round(gridStressReduction * 10) / 10,
      timeOfUse,
      adjustedGridPrice: Math.round(adjustedGridPrice * 1000) / 1000
    };
  }

  // Multi-period optimization for day-ahead planning
  optimizeDayAhead(
    demands: number[],
    solarForecasts: number[],
    gridPrices: number[],
    timeOfUseSchedule: ('peak' | 'off-peak' | 'mid-peak')[],
    initialBatteryLevel: number = 25
  ): OptimizationResult[] {
    const results: OptimizationResult[] = [];
    let batteryLevel = initialBatteryLevel;
    
    for (let i = 0; i < demands.length; i++) {
      const result = this.optimize(
        demands[i],
        solarForecasts[i],
        gridPrices[i],
        batteryLevel,
        timeOfUseSchedule[i]
      );
      
      // Update battery level for next period
      batteryLevel = Math.max(0, Math.min(this.batteryCapacity, 
        batteryLevel - result.batteryKwh + result.batteryCharge));
      
      results.push({
        ...result,
        batteryLevel: Math.round(batteryLevel * 100) / 100
      });
    }
    
    return results;
  }

  // Advanced load shifting optimization
  optimizeLoadShifting(
    flexibleLoads: { name: string, kwh: number, timeWindow: number[] }[],
    demands: number[],
    solarForecasts: number[],
    gridPrices: number[]
  ): { shiftedLoads: any[], totalSavings: number } {
    const shiftedLoads: any[] = [];
    let totalSavings = 0;
    
    flexibleLoads.forEach(load => {
      let bestHour = load.timeWindow[0];
      let bestCost = Infinity;
      
      // Find optimal time slot within the allowed window
      load.timeWindow.forEach(hour => {
        if (hour < demands.length) {
          const cost = this.calculateLoadCost(load.kwh, hour, demands, solarForecasts, gridPrices);
          if (cost < bestCost) {
            bestCost = cost;
            bestHour = hour;
          }
        }
      });
      
      // Calculate savings from shifting
      const originalCost = this.calculateLoadCost(load.kwh, load.timeWindow[0], demands, solarForecasts, gridPrices);
      const savings = originalCost - bestCost;
      
      shiftedLoads.push({
        name: load.name,
        originalHour: load.timeWindow[0],
        optimalHour: bestHour,
        savings: Math.round(savings * 100) / 100
      });
      
      totalSavings += savings;
    });
    
    return {
      shiftedLoads,
      totalSavings: Math.round(totalSavings * 100) / 100
    };
  }

  private calculateLoadCost(
    loadKwh: number,
    hour: number,
    demands: number[],
    solarForecasts: number[],
    gridPrices: number[]
  ): number {
    const totalDemand = demands[hour] + loadKwh;
    const solarAvailable = solarForecasts[hour];
    const gridPrice = gridPrices[hour];
    
    const gridNeeded = Math.max(0, totalDemand - solarAvailable);
    return gridNeeded * gridPrice;
  }

  private calculatePeakReduction(demandKwh: number, solarKwh: number, batteryKwh: number): number {
    const netDemand = demandKwh - solarKwh - batteryKwh;
    const peakThreshold = 40; // kWh
    
    if (demandKwh > peakThreshold && netDemand < peakThreshold) {
      return ((demandKwh - netDemand) / demandKwh) * 100;
    }
    
    return 0;
  }

  private calculateGridStressReduction(gridKwh: number, totalDemand: number): number {
    const gridDependency = gridKwh / totalDemand;
    return (1 - gridDependency) * 100;
  }

  // Real-time price response optimization
  optimizeForRealTimePrice(
    currentPrice: number,
    averagePrice: number,
    demandKwh: number,
    solarKwh: number,
    batteryLevel: number
  ): { action: string, recommendation: string, potentialSavings: number } {
    const priceRatio = currentPrice / averagePrice;
    
    if (priceRatio > 1.5 && batteryLevel > 10) {
      // High price - use battery
      return {
        action: 'use_battery',
        recommendation: 'Grid prices are high. Using battery storage to reduce costs.',
        potentialSavings: (demandKwh * currentPrice * 0.7)
      };
    } else if (priceRatio < 0.7 && solarKwh > demandKwh) {
      // Low price + excess solar - charge battery
      return {
        action: 'charge_battery',
        recommendation: 'Low grid prices and excess solar. Charging battery for later use.',
        potentialSavings: (solarKwh - demandKwh) * (averagePrice - currentPrice)
      };
    } else if (priceRatio > 1.2) {
      // Moderate high price - reduce non-essential loads
      return {
        action: 'reduce_load',
        recommendation: 'Consider reducing non-essential loads during peak pricing.',
        potentialSavings: demandKwh * 0.1 * currentPrice
      };
    }
    
    return {
      action: 'maintain',
      recommendation: 'Current pricing is optimal. No action needed.',
      potentialSavings: 0
    };
  }
}