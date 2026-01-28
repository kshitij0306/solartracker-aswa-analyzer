export interface TrackerParams {
  latitude: number;
  longitude: number;
  panelChord: number; // Width of the panel (meters)
  trackerLength: number; // Length of the panel/row (meters) - North-South
  rowSpacing: number; // Pitch (meters)
  hubHeight: number; // Height of the axis from ground (meters)
  backtracking: boolean;
  maxRotation: number; // Degrees
  numberOfRows: number; // Number of trackers to visualize
  startTime: number; // Simulation start hour (0-23)
  endTime: number; // Simulation end hour (1-24)
}

export interface SimulationResult {
  totalASWA: number; // Annual Shade-Weighted Area (unitless simplified metric or m2-hrs)
  shadingLossPercent: number;
  monthlyData: MonthlyStat[];
  hourlyHeatmap: HeatmapPoint[];
  groundHeatmap2D: {
    grid: Float32Array; // Flattened 2D array of intensity (0-1)
    width: number; // Number of cells X
    height: number; // Number of cells Y
    resolution: number; // meters per cell
    xMin: number; // World X coordinate of left edge
    yMin: number; // World Y coordinate of bottom edge
  };
}

export interface MonthlyStat {
  month: string;
  avgShading: number;
  totalIrradiance: number;
}

export interface HeatmapPoint {
  hour: number; // 0-23
  day: number; // 0-364
  shading: number; // 0-1
  irradiance: number;
}

export enum CalculationStatus {
  IDLE = 'IDLE',
  CALCULATING = 'CALCULATING',
  COMPLETE = 'COMPLETE'
}