import React, { useRef, useEffect, useState, useMemo } from 'react';
import { ArrowUp, Maximize2, Move, MousePointer2, Box, Crosshair } from 'lucide-react';
import { TrackerParams } from '../types';

interface Props {
  mapData: {
    grid: Float32Array;
    width: number;
    height: number;
    resolution: number;
    xMin: number;
    yMin: number;
  };
  params: TrackerParams;
}

// Simple 3D Geometry Types
interface Point3D { x: number; y: number; z: number; }
interface Polygon3D { points: Point3D[]; color: string; zDepth: number; isWireframe?: boolean }

const GroundHeatmap3D: React.FC<Props> = ({ mapData, params }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Camera State
  const [camera, setCamera] = useState({
    azimuth: 45 * (Math.PI / 180), // Angle around Z axis
    elevation: 45 * (Math.PI / 180), // Angle up from ground
    distance: 30, // Distance from target
    targetX: 0,
    targetY: 0
  });

  const [hoverInfo, setHoverInfo] = useState<{x: number, y: number, value: number, screenX: number, screenY: number} | null>(null);

  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const dragType = useRef<'orbit' | 'pan'>('orbit');

  // Constants
  const FOV = 800;
  const COLORS = {
    background: '#0B0F19',
    grid: '#1F2937',
    panelFill: 'rgba(56, 189, 248, 0.15)', // Sky Blue 400
    panelStroke: 'rgba(56, 189, 248, 0.6)',
    axisX: '#ef4444',
    axisY: '#22c55e',
    axisZ: '#3b82f6'
  };

  // --- 3D Matrix Logic (Memoized for Render + Raycast) ---
  const viewParams = useMemo(() => {
    // Camera Position in World
    const camX = camera.targetX + camera.distance * Math.cos(camera.elevation) * Math.sin(camera.azimuth);
    const camY = camera.targetY + camera.distance * Math.cos(camera.elevation) * Math.cos(camera.azimuth);
    const camZ = camera.distance * Math.sin(camera.elevation);

    // Forward Vector (Camera -> Target)
    const fX = camera.targetX - camX;
    const fY = camera.targetY - camY;
    const fZ = 0 - camZ;
    const fLen = Math.sqrt(fX*fX + fY*fY + fZ*fZ);
    const fx = fX/fLen, fy = fY/fLen, fz = fZ/fLen;

    // Right Vector (Cross WorldUP and Forward). World UP is Z (0,0,1)
    // R = UP x F = (0,0,1) x (fx, fy, fz) = (-fy, fx, 0)
    let rX = -fy, rY = fx, rZ = 0;
    const rLen = Math.sqrt(rX*rX + rY*rY);
    if (rLen > 0.0001) { rX /= rLen; rY /= rLen; }

    // Up Vector (Cross Forward and Right)
    // U = F x R
    const uX = fy*rZ - fz*rY; 
    const uY = fz*rX - fx*rZ; 
    const uZ = fx*rY - fy*rX; 

    return { camX, camY, camZ, rX, rY, rZ, uX, uY, uZ, fx, fy, fz };
  }, [camera]);

  // --- Interaction Handlers ---
  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    dragType.current = e.button === 2 ? 'pan' : 'orbit'; 
    setHoverInfo(null); // Clear hover during interaction
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // 1. Dragging Logic
    if (isDragging.current) {
      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      lastMouse.current = { x: e.clientX, y: e.clientY };

      if (dragType.current === 'orbit') {
        setCamera(prev => ({
          ...prev,
          azimuth: prev.azimuth - dx * 0.01,
          elevation: Math.max(0.1, Math.min(Math.PI / 2 - 0.1, prev.elevation + dy * 0.01))
        }));
      } else {
        const panSpeed = camera.distance * 0.002;
        const moveX = -dx * panSpeed * Math.sin(camera.azimuth) - dy * panSpeed * Math.cos(camera.azimuth);
        const moveY = dx * panSpeed * Math.cos(camera.azimuth) - dy * panSpeed * Math.sin(camera.azimuth);
        setCamera(prev => ({
          ...prev,
          targetX: prev.targetX + moveX,
          targetY: prev.targetY + moveY
        }));
      }
      return; 
    }

    // 2. Raycasting Logic (Hover)
    const CX = rect.width / 2;
    const CY = rect.height / 2;
    const { camX, camY, camZ, rX, rY, rZ, uX, uY, uZ, fx, fy, fz } = viewParams;

    // View Space Ray: Screen coords -> View Direction
    // sx = px * (fov/z) + CX  =>  px = (sx - CX) / fov * z
    // We construct a ray direction vector for z=1
    const dirViewX = (mx - CX) / FOV;
    const dirViewY = -(my - CY) / FOV; // Invert Y because screen Y is down
    const dirViewZ = 1; // Forward

    // Transform to World Space Direction
    // D_world = D_view.x * R + D_view.y * U + D_view.z * F
    const dwX = dirViewX * rX + dirViewY * uX + dirViewZ * fx;
    const dwY = dirViewX * rY + dirViewY * uY + dirViewZ * fy;
    const dwZ = dirViewX * rZ + dirViewY * uZ + dirViewZ * fz;

    // Intersect Ray with Ground Plane (Z = 0)
    // Ray: Origin + t * Direction
    // Oz + t * Dz = 0  =>  t = -Oz / Dz
    if (Math.abs(dwZ) > 0.0001) {
       const t = -camZ / dwZ;
       if (t > 0) {
          const ix = camX + t * dwX;
          const iy = camY + t * dwY;

          // Lookup in Grid
          const { grid, width: gw, resolution, xMin, yMin, height: gh } = mapData;
          const col = Math.floor((ix - xMin) / resolution);
          const row = Math.floor((iy - yMin) / resolution);

          if (col >= 0 && col < gw && row >= 0 && row < gh) {
             const idx = row * gw + col;
             const val = grid[idx];
             setHoverInfo({
               x: ix,
               y: iy,
               value: val,
               screenX: mx,
               screenY: my
             });
             return;
          }
       }
    }
    setHoverInfo(null);
  };

  const handleMouseUp = () => { isDragging.current = false; };
  const handleWheel = (e: React.WheelEvent) => {
    const zoomSpeed = 0.001 * camera.distance;
    setCamera(prev => ({
      ...prev,
      distance: Math.max(2, Math.min(200, prev.distance + e.deltaY * zoomSpeed))
    }));
  };
  const handleContextMenu = (e: React.MouseEvent) => e.preventDefault();

  // --- Rendering Loop ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !mapData || !params) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    if (containerRef.current) {
        const dpr = window.devicePixelRatio || 1;
        const rect = containerRef.current.getBoundingClientRect();
        if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            canvas.style.width = `${rect.width}px`;
            canvas.style.height = `${rect.height}px`;
        }
        ctx.resetTransform(); // Clear previous scale
        ctx.scale(dpr, dpr);
    }

    const W = canvas.width / (window.devicePixelRatio || 1);
    const H = canvas.height / (window.devicePixelRatio || 1);
    const CX = W / 2;
    const CY = H / 2;

    const { camX, camY, camZ, rX, rY, rZ, uX, uY, uZ, fx, fy, fz } = viewParams;

    // Project Function (World -> Screen)
    const project = (x: number, y: number, z: number): { x: number, y: number, scale: number } | null => {
      const tx = x - camX;
      const ty = y - camY;
      const tz = z - camZ;

      const px = tx*rX + ty*rY + tz*rZ;
      const py = tx*uX + ty*uY + tz*uZ; 
      const pz = tx*fx + ty*fy + tz*fz; 

      if (pz <= 0.1) return null; 

      const scale = FOV / pz;
      const sx = px * scale + CX;
      const sy = -py * scale + CY; 

      return { x: sx, y: sy, scale };
    };

    // --- Draw Scene ---
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, W, H);

    // 1. Ground Grid Lines (Near Camera)
    const gridRange = 40; 
    const step = 5;
    const startX = Math.floor((camera.targetX - gridRange)/step) * step;
    const endX = Math.floor((camera.targetX + gridRange)/step) * step;
    const startY = Math.floor((camera.targetY - gridRange)/step) * step;
    const endY = Math.floor((camera.targetY + gridRange)/step) * step;

    ctx.beginPath();
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    for(let x=startX; x<=endX; x+=step) {
      const p1 = project(x, startY, 0);
      const p2 = project(x, endY, 0);
      if(p1 && p2) { ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); }
    }
    for(let y=startY; y<=endY; y+=step) {
      const p1 = project(startX, y, 0);
      const p2 = project(endX, y, 0);
      if(p1 && p2) { ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); }
    }
    ctx.stroke();

    // 2. Heatmap Cells
    const polygons: Polygon3D[] = [];
    const { grid, width: gw, resolution, xMin, yMin } = mapData;
    
    // Draw cursor highlight on ground if hovering
    if (hoverInfo) {
        const hx = Math.floor((hoverInfo.x - xMin) / resolution) * resolution + xMin;
        const hy = Math.floor((hoverInfo.y - yMin) / resolution) * resolution + yMin;
        const hp1 = { x: hx, y: hy, z: 0.05 }; // slightly above ground to prevent z-fight
        const hp2 = { x: hx + resolution, y: hy, z: 0.05 };
        const hp3 = { x: hx + resolution, y: hy + resolution, z: 0.05 };
        const hp4 = { x: hx, y: hy + resolution, z: 0.05 };
        polygons.push({ points: [hp1, hp2, hp3, hp4], color: 'rgba(255, 255, 255, 0.4)', zDepth: 0.05 });
    }

    for(let i=0; i<grid.length; i++) {
        const val = grid[i];
        if(val > 0.05) { 
            const gx = i % gw;
            const gy = Math.floor(i / gw);
            const wx = xMin + gx * resolution;
            const wy = yMin + gy * resolution;

            // Clip far cells
            const dx = wx - camera.targetX;
            const dy = wy - camera.targetY;
            if (dx*dx + dy*dy > 2500) continue; 

            const p1 = { x: wx, y: wy, z: 0 };
            const p2 = { x: wx + resolution, y: wy, z: 0 };
            const p3 = { x: wx + resolution, y: wy + resolution, z: 0 };
            const p4 = { x: wx, y: wy + resolution, z: 0 };

            let color = '';
            const t = Math.min(1, val);
            if (t < 0.5) {
                const n = t * 2;
                const r = Math.floor(253 + (239 - 253)*n);
                const g = Math.floor(224 + (68 - 224)*n);
                const b = Math.floor(71 + (68 - 71)*n);
                color = `rgb(${r},${g},${b})`;
            } else {
                const n = (t - 0.5) * 2;
                const r = Math.floor(239 + (88 - 239)*n);
                const g = Math.floor(68 + (28 - 68)*n);
                const b = Math.floor(68 + (135 - 68)*n);
                color = `rgb(${r},${g},${b})`;
            }

            polygons.push({
                points: [p1, p2, p3, p4],
                color: color,
                zDepth: 0
            });
        }
    }

    // 3. Solar Panels
    const { numberOfRows, rowSpacing, panelChord, trackerLength, hubHeight } = params;
    const halfChord = panelChord / 2;
    const halfLen = trackerLength / 2;

    for (let r = 0; r < numberOfRows; r++) {
      const cx = (r - (numberOfRows - 1) / 2) * rowSpacing;
      const cy = 0;
      const cz = hubHeight;

      const p1 = { x: cx - halfChord, y: cy + halfLen, z: cz };
      const p2 = { x: cx + halfChord, y: cy + halfLen, z: cz };
      const p3 = { x: cx + halfChord, y: cy - halfLen, z: cz };
      const p4 = { x: cx - halfChord, y: cy - halfLen, z: cz };

      polygons.push({
        points: [p1, p2, p3, p4],
        color: COLORS.panelFill,
        zDepth: cz,
        isWireframe: true
      });
    }

    // Sort & Rasterize
    const getDistSq = (p: Point3D) => {
       const dx = p.x - camX;
       const dy = p.y - camY;
       const dz = p.z - camZ;
       return dx*dx + dy*dy + dz*dz;
    };

    const sortedPolys = polygons.map(poly => ({ ...poly, dist: getDistSq(poly.points[0]) }))
                                .sort((a, b) => b.dist - a.dist);

    for(const poly of sortedPolys) {
        const projPoints = poly.points.map(p => project(p.x, p.y, p.z));
        if(projPoints.some(p => p === null)) continue;

        ctx.beginPath();
        const p0 = projPoints[0]!;
        ctx.moveTo(p0.x, p0.y);
        for(let i=1; i<projPoints.length; i++) ctx.lineTo(projPoints[i]!.x, projPoints[i]!.y);
        ctx.closePath();

        if (poly.isWireframe) {
            ctx.fillStyle = poly.color;
            ctx.fill();
            ctx.strokeStyle = COLORS.panelStroke;
            ctx.lineWidth = 1;
            ctx.stroke();
        } else {
            ctx.fillStyle = poly.color;
            ctx.fill();
        }
    }

    // Draw Posts
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    for (let r = 0; r < numberOfRows; r++) {
        const cx = (r - (numberOfRows - 1) / 2) * rowSpacing;
        const cy = 0;
        const cz = hubHeight;
        [cy + halfLen * 0.8, cy - halfLen * 0.8].forEach(py => {
            const top = project(cx, py, cz);
            const bot = project(cx, py, 0);
            if(top && bot) {
                ctx.beginPath();
                ctx.moveTo(bot.x, bot.y);
                ctx.lineTo(top.x, top.y);
                ctx.stroke();
            }
        });
    }

    // Axis Arrows
    const t0 = project(camera.targetX, camera.targetY, 0);
    const tx = project(camera.targetX + 2, camera.targetY, 0);
    const ty = project(camera.targetX, camera.targetY + 2, 0);
    const tz = project(camera.targetX, camera.targetY, 2);
    if (t0 && tx && ty && tz) {
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.strokeStyle = COLORS.axisX; ctx.moveTo(t0.x, t0.y); ctx.lineTo(tx.x, tx.y); ctx.stroke();
        ctx.beginPath(); ctx.strokeStyle = COLORS.axisY; ctx.moveTo(t0.x, t0.y); ctx.lineTo(ty.x, ty.y); ctx.stroke();
        ctx.beginPath(); ctx.strokeStyle = COLORS.axisZ; ctx.moveTo(t0.x, t0.y); ctx.lineTo(tz.x, tz.y); ctx.stroke();
    }

  }, [mapData, params, viewParams, hoverInfo]); // Depend on viewParams and hoverInfo

  return (
    <div className="flex flex-col h-full w-full relative group select-none">
       {/* Overlay Controls */}
       <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 pointer-events-none">
          <div className="bg-black/80 backdrop-blur border border-gray-700 p-3 rounded-lg text-xs text-gray-300 shadow-xl space-y-2">
             <div className="flex items-center gap-2">
                <MousePointer2 className="w-4 h-4 text-blue-400" />
                <span className="font-bold text-white">Controls</span>
             </div>
             <div className="flex items-center justify-between gap-4">
               <span>Rotate</span>
               <span className="text-gray-500">Left Click + Drag</span>
             </div>
             <div className="flex items-center justify-between gap-4">
               <span>Pan</span>
               <span className="text-gray-500">Right Click + Drag</span>
             </div>
             <div className="flex items-center justify-between gap-4">
               <span>Zoom</span>
               <span className="text-gray-500">Scroll Wheel</span>
             </div>
          </div>
       </div>

       {/* Reset Button */}
       <div className="absolute top-4 right-4 z-10">
          <button 
             onClick={() => setCamera({ azimuth: 45 * (Math.PI/180), elevation: 45 * (Math.PI/180), distance: 30, targetX: 0, targetY: 0 })}
             className="bg-gray-800 p-2 rounded border border-gray-700 hover:bg-gray-700 text-white shadow-lg flex items-center gap-2 text-xs font-bold"
          >
            <Box className="w-4 h-4" /> Reset View
          </button>
       </div>

       {/* HOVER TOOLTIP */}
       {hoverInfo && (
           <div 
             className="absolute z-50 pointer-events-none bg-black/90 border border-yellow-500/50 p-2 rounded shadow-2xl backdrop-blur-md flex flex-col gap-1"
             style={{ 
               left: hoverInfo.screenX + 15, 
               top: hoverInfo.screenY + 15,
             }}
           >
              <div className="flex items-center gap-2 text-yellow-500 font-bold text-xs uppercase tracking-wider border-b border-gray-800 pb-1 mb-1">
                 <Crosshair className="w-3 h-3" />
                 Coordinates
              </div>
              <div className="grid grid-cols-2 gap-x-3 text-[10px] text-gray-400 font-mono">
                  <span>X (East):</span>
                  <span className="text-white text-right">{hoverInfo.x.toFixed(2)} m</span>
                  <span>Y (North):</span>
                  <span className="text-white text-right">{hoverInfo.y.toFixed(2)} m</span>
              </div>
              <div className="mt-1 pt-1 border-t border-gray-800 flex justify-between items-center">
                 <span className="text-xs text-gray-300 font-bold">Shade:</span>
                 <span className={`text-sm font-mono font-bold ${hoverInfo.value > 0.5 ? 'text-red-500' : hoverInfo.value > 0 ? 'text-yellow-400' : 'text-green-500'}`}>
                    {(hoverInfo.value * 100).toFixed(1)}%
                 </span>
              </div>
           </div>
       )}

       {/* Canvas Container */}
       <div 
         ref={containerRef} 
         className="flex-1 bg-[#0B0F19] overflow-hidden relative cursor-crosshair"
         onMouseDown={handleMouseDown}
         onMouseMove={handleMouseMove}
         onMouseUp={handleMouseUp}
         onMouseLeave={handleMouseUp}
         onWheel={handleWheel}
         onContextMenu={handleContextMenu}
       >
          <canvas ref={canvasRef} className="w-full h-full block" />
       </div>

       {/* Legend */}
       <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center justify-center gap-6 bg-black/80 p-3 px-6 rounded-full border border-gray-700 shadow-2xl backdrop-blur pointer-events-none">
         <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-sky-400/30 border border-sky-400"></div>
            <span className="text-xs text-gray-300 font-bold">Tracker</span>
         </div>
         <div className="h-4 w-px bg-gray-600"></div>
         <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-yellow-300">Low Shade</span>
            <div className="w-40 h-2 bg-gradient-to-r from-yellow-300 via-red-500 to-purple-800 rounded-full"></div>
            <span className="text-xs font-bold text-purple-400">High Shade</span>
         </div>
       </div>
    </div>
  );
};

export default GroundHeatmap3D;