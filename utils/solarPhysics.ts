import { TrackerParams, SimulationResult, MonthlyStat, HeatmapPoint } from '../types';

// Constants
const PI = Math.PI;
const DEG_TO_RAD = PI / 180;
const RAD_TO_DEG = 180 / PI;

// Helper: Solar Position Algorithm
const getSolarPosition = (doy: number, hour: number, lat: number) => {
  const declination = 23.45 * Math.sin(DEG_TO_RAD * (360 / 365) * (doy - 81));
  const B = DEG_TO_RAD * (360 / 364) * (doy - 81);
  const eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
  
  const solarTime = hour + eot / 60; 
  const hourAngle = (solarTime - 12) * 15;
  
  const latRad = lat * DEG_TO_RAD;
  const decRad = declination * DEG_TO_RAD;
  const haRad = hourAngle * DEG_TO_RAD;
  
  const sinElev = Math.sin(latRad) * Math.sin(decRad) + Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad);
  const elevation = Math.asin(Math.max(-1, Math.min(1, sinElev))) * RAD_TO_DEG;
  
  const cosAzimuth = (Math.sin(decRad) - Math.sin(latRad) * Math.sin(DEG_TO_RAD * elevation)) / (Math.cos(latRad) * Math.cos(DEG_TO_RAD * elevation));
  const azimuthRaw = Math.acos(Math.max(-1, Math.min(1, cosAzimuth))) * RAD_TO_DEG;
  const azimuth = hourAngle > 0 ? 360 - azimuthRaw : azimuthRaw;
  
  return { elevation, azimuth };
};

// Calculate tracker state (rotation and shading on panels)
const calculateTrackerState = (sunElev: number, sunAz: number, params: TrackerParams) => {
  if (sunElev <= 0) return { angle: 0, shadedFraction: 0 };

  const sunZenith = 90 - sunElev;
  const sunAzSouth = sunAz - 180;
  
  let theta = RAD_TO_DEG * Math.atan(Math.tan(sunZenith * DEG_TO_RAD) * Math.sin(sunAzSouth * DEG_TO_RAD));
  theta = Math.max(-params.maxRotation, Math.min(params.maxRotation, theta));
  
  if (params.backtracking) {
     return { angle: theta, shadedFraction: 0 };
  }

  const azRad = sunAz * DEG_TO_RAD;
  const elevRad = sunElev * DEG_TO_RAD;
  
  // Profile angle calculation
  let tanProfile = Math.tan(elevRad) / Math.abs(Math.sin(azRad)); 
  if (!Number.isFinite(tanProfile)) tanProfile = 1000;
  const profileAngleRad = Math.atan(tanProfile);
  
  const thetaAbs = Math.abs(theta * DEG_TO_RAD);
  const w = params.panelChord;
  const p = params.rowSpacing;
  
  const shadowTipX = (w/2) * Math.cos(thetaAbs) + (w/2) * Math.sin(thetaAbs) / Math.tan(profileAngleRad);
  const victimEdgeX = p - (w/2) * Math.cos(thetaAbs);
  const overlapX = shadowTipX - victimEdgeX;
  
  let shadedFraction = 0;
  if (overlapX > 0) {
    shadedFraction = Math.min(1, overlapX / (w * Math.cos(thetaAbs))); 
  }
  
  return { angle: theta, shadedFraction: Math.max(0, shadedFraction) };
};

// Instantaneous data for visualizer
export const getInstantaneousData = (doy: number, hour: number, params: TrackerParams) => {
  const { elevation, azimuth } = getSolarPosition(doy, hour, params.latitude);
  const { angle } = calculateTrackerState(elevation, azimuth, params);

  const radAz = azimuth * DEG_TO_RAD;
  const radEl = elevation * DEG_TO_RAD;

  // Visualizer Sun Vector (East-West Plane)
  const visSunX = -Math.cos(radEl) * Math.sin(radAz);
  const visSunY = Math.sin(radEl);
  const profileAngle = Math.atan2(visSunY, visSunX);

  return {
    trackerAngle: angle,
    sunElevation: elevation,
    sunAzimuth: azimuth,
    profileAngleRad: profileAngle,
    isValid: elevation > 0
  };
};

export const simulateYear = (params: TrackerParams): SimulationResult => {
  const monthlyData: MonthlyStat[] = [];
  const hourlyHeatmap: HeatmapPoint[] = [];
  
  // --- 3D Ground Heatmap Initialization ---
  // Grid Dimensions
  // World space bounds
  const marginX = 10; // meters padding East/West
  const marginY = 10; // meters padding North/South
  
  const arrayWidth = (params.numberOfRows - 1) * params.rowSpacing + params.panelChord;
  const arrayLength = params.trackerLength;
  
  // Centered at (0,0)
  const xMin = -arrayWidth / 2 - marginX;
  const xMax = arrayWidth / 2 + marginX;
  const yMin = -arrayLength / 2 - marginY;
  const yMax = arrayLength / 2 + marginY;
  
  // EXTREME RESOLUTION: 0.1 meters (10cm) for deep zoom detail
  const resolution = 0.1; 
  const gridW = Math.ceil((xMax - xMin) / resolution);
  const gridH = Math.ceil((yMax - yMin) / resolution);
  
  // Use Float32Array for performance with large grids
  const groundGrid = new Float32Array(gridW * gridH).fill(0);
  let totalDaylightHours = 0;

  // --- Helpers for Projection ---
  const projectPoint = (px: number, py: number, pz: number, sunVec: {x:number, y:number, z:number}) => {
    // Ray: P - t*S. Intersect z=0.
    const t = pz / sunVec.z;
    return {
      x: px - t * sunVec.x,
      y: py - t * sunVec.y
    };
  };

  const rasterizePolygon = (points: {x:number, y:number}[]) => {
    // Simple Bounding Box Rasterization
    let minX = Number.MAX_VALUE, maxX = -Number.MAX_VALUE;
    let minY = Number.MAX_VALUE, maxY = -Number.MAX_VALUE;
    
    for(const p of points) {
      if(p.x < minX) minX = p.x;
      if(p.x > maxX) maxX = p.x;
      if(p.y < minY) minY = p.y;
      if(p.y > maxY) maxY = p.y;
    }

    // Clamp to grid
    const iMin = Math.max(0, Math.floor((minX - xMin) / resolution));
    const iMax = Math.min(gridW - 1, Math.floor((maxX - xMin) / resolution));
    const jMin = Math.max(0, Math.floor((minY - yMin) / resolution));
    const jMax = Math.min(gridH - 1, Math.floor((maxY - yMin) / resolution));

    for (let j = jMin; j <= jMax; j++) {
      const yCenter = yMin + j * resolution + resolution/2;
      for (let i = iMin; i <= iMax; i++) {
        const xCenter = xMin + i * resolution + resolution/2;
        
        // Point in Polygon Test
        let inside = false;
        for (let k = 0, l = points.length - 1; k < points.length; l = k++) {
            const xi = points[k].x, yi = points[k].y;
            const xj = points[l].x, yj = points[l].y;
            
            const intersect = ((yi > yCenter) !== (yj > yCenter))
                && (xCenter < (xj - xi) * (yCenter - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        
        if (inside) {
          groundGrid[j * gridW + i] += 1;
        }
      }
    }
  };

  let totalWeightedShade = 0;
  let totalIrradianceSum = 0;
  
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  // Optimization: With 0.1m grid, we might need to be careful.
  // We can step days/hours slightly to keep it responsive, visual accuracy remains high.
  const timeStep = 1; // Hour
  const dayStep = 5; // Every 5 days is sufficient for annual aggregation heatmap
  
  for (let m = 0; m < 12; m++) {
    let monthShadeSum = 0;
    let monthIrrSum = 0;
    const daysInMonth = 30; // Simplified
    const startDay = m * 30;
    
    for (let d = 0; d < daysInMonth; d+=dayStep) {
      const doy = startDay + d;
      
      // Use configured start and end time
      // Ensure we don't go out of bounds or loop infinitely if startTime >= endTime
      const startH = Math.max(0, Math.min(23, params.startTime));
      const endH = Math.max(startH + 1, Math.min(24, params.endTime));

      for (let h = startH; h < endH; h += timeStep) { 
        const { elevation, azimuth } = getSolarPosition(doy, h, params.latitude);
        
        if (elevation > 0) {
          totalDaylightHours++;
          
          // --- 1. Panel Shading Calculation ---
          const zenith = 90 - elevation;
          const airMass = 1 / (Math.cos(zenith * DEG_TO_RAD) + 0.50572 * Math.pow(96.07995 - zenith, -1.6364));
          const irradiance = 1353 * Math.pow(0.7, Math.pow(airMass, 0.678));
          
          const { shadedFraction, angle } = calculateTrackerState(elevation, azimuth, params);
          
          const shadeValue = shadedFraction * irradiance;
          monthShadeSum += shadeValue;
          monthIrrSum += irradiance;
          totalWeightedShade += shadeValue;
          totalIrradianceSum += irradiance;
          
          hourlyHeatmap.push({
            day: doy,
            hour: h,
            shading: shadedFraction,
            irradiance: irradiance
          });

          // --- 2. 3D Ground Shadow Calculation ---
          const azRad = azimuth * DEG_TO_RAD;
          const elRad = elevation * DEG_TO_RAD;
          const sunVec = {
            x: Math.sin(azRad) * Math.cos(elRad),
            y: Math.cos(azRad) * Math.cos(elRad),
            z: Math.sin(elRad)
          };

          const thetaRad = angle * DEG_TO_RAD;
          const halfW = params.panelChord / 2;
          const halfL = params.trackerLength / 2;
          const H = params.hubHeight;

          const c1 = { x: halfW * Math.cos(thetaRad), z: halfW * Math.sin(thetaRad), y: halfL };
          const c2 = { x: halfW * Math.cos(thetaRad), z: halfW * Math.sin(thetaRad), y: -halfL };
          const c3 = { x: -halfW * Math.cos(thetaRad), z: -halfW * Math.sin(thetaRad), y: -halfL };
          const c4 = { x: -halfW * Math.cos(thetaRad), z: -halfW * Math.sin(thetaRad), y: halfL };

          const offsets = [c1, c2, c3, c4];

          const numRows = params.numberOfRows;
          for(let r=0; r<numRows; r++) {
             const rowX = (r - (numRows-1)/2) * params.rowSpacing;
             const rowY = 0;
             
             const polyPoints = offsets.map(off => {
               const Px = rowX + off.x;
               const Py = rowY + off.y;
               const Pz = H + off.z;
               return projectPoint(Px, Py, Pz, sunVec);
             });
             
             rasterizePolygon(polyPoints);
          }
        }
      }
    }
    
    monthlyData.push({
      month: monthNames[m],
      avgShading: monthIrrSum > 0 ? (monthShadeSum / monthIrrSum) : 0,
      totalIrradiance: monthIrrSum
    });
  }

  // Normalize Grid
  for(let i=0; i<groundGrid.length; i++) {
    groundGrid[i] = totalDaylightHours > 0 ? groundGrid[i] / totalDaylightHours : 0;
  }

  return {
    totalASWA: totalWeightedShade, 
    shadingLossPercent: totalIrradianceSum > 0 ? (totalWeightedShade / totalIrradianceSum) * 100 : 0,
    monthlyData,
    hourlyHeatmap,
    groundHeatmap2D: {
      grid: groundGrid,
      width: gridW,
      height: gridH,
      resolution,
      xMin,
      yMin
    }
  };
};