import React, { useRef, useEffect, useState } from 'react';
import { TrackerParams } from '../types';
import { getInstantaneousData } from '../utils/solarPhysics';
import { Clock, Calendar, Leaf } from 'lucide-react';

interface Props {
  params: TrackerParams;
  // removed groundShadingProfile 1D support
}

const ShadowVisualizer: React.FC<Props> = ({ params }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [doy, setDoy] = useState(172); // Summer Solstice default
  const [hour, setHour] = useState(10); // Morning default
  
  // Derived state for display
  const [data, setData] = useState<any>(null);

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHour(parseFloat(e.target.value));
  };
  
  const handleDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDoy(parseInt(e.target.value));
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calc physics
    const physics = getInstantaneousData(doy, hour, params);
    setData(physics);

    // Setup Canvas
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Dynamic Scaling logic
    let scale = 40;
    const totalWidthMeters = params.numberOfRows * params.rowSpacing + params.rowSpacing; 
    scale = Math.min(60, (w - 40) / totalWidthMeters);

    const groundY = h - 60; 
    const centerX = w / 2;

    const toScreen = (x: number, y: number) => ({
      x: centerX + x * scale,
      y: groundY - y * scale
    });

    // Draw Sky Background
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#0f172a'); 
    gradient.addColorStop(1, '#1e293b'); 
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Draw Ground (Base)
    ctx.beginPath();
    ctx.fillStyle = '#3f6212'; 
    ctx.fillRect(0, groundY, w, h - groundY);
    
    // Draw Ground Line
    ctx.beginPath();
    ctx.strokeStyle = '#65a30d'; 
    ctx.lineWidth = 2;
    ctx.moveTo(0, groundY);
    ctx.lineTo(w, groundY);
    ctx.stroke();

    if (!physics.isValid) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText("Night Time", centerX, h/2);
      return;
    }

    // Draw Sun Direction
    const sunLen = 50;
    const sunX = Math.cos(physics.profileAngleRad) * sunLen;
    const sunY = Math.sin(physics.profileAngleRad) * sunLen;
    
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)'; 
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.moveTo(centerX, groundY - params.hubHeight * scale);
    ctx.lineTo(centerX + sunX * 10, groundY - params.hubHeight * scale - sunY * 10);
    ctx.stroke();
    ctx.setLineDash([]);

    const numRows = params.numberOfRows || 3;
    const rows = [];
    for (let i = 0; i < numRows; i++) {
      rows.push(i - (numRows - 1) / 2);
    }
    
    // Live Shadows
    const tanAlpha = Math.tan(physics.profileAngleRad);
    const stableTan = Math.abs(tanAlpha) < 0.01 ? (tanAlpha >= 0 ? 0.01 : -0.01) : tanAlpha;
    const cotAlpha = 1 / stableTan;
    
    const radTilt = physics.trackerAngle * (Math.PI / 180);
    const halfW = params.panelChord / 2;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'; 
    
    rows.forEach(rowOffset => {
      const rowX = rowOffset * params.rowSpacing;
      const hubPos = { x: rowX, y: params.hubHeight };

      const p1 = {
        x: hubPos.x - halfW * Math.cos(radTilt),
        y: hubPos.y + halfW * Math.sin(radTilt)
      };
      const p2 = {
        x: hubPos.x + halfW * Math.cos(radTilt),
        y: hubPos.y - halfW * Math.sin(radTilt)
      };

      const g1x = p1.x - p1.y * cotAlpha;
      const g2x = p2.x - p2.y * cotAlpha;
      
      const sG1 = toScreen(g1x, 0);
      const sG2 = toScreen(g2x, 0);

      const sx = Math.min(sG1.x, sG2.x);
      const sw = Math.abs(sG2.x - sG1.x);
      
      if (sw < w * 2) {
        ctx.fillRect(sx, groundY, sw, 6); 
      }
    });

    // Structures
    rows.forEach(rowOffset => {
      const rowX = rowOffset * params.rowSpacing;
      const hubPos = { x: rowX, y: params.hubHeight };
      
      const p1 = {
        x: hubPos.x - halfW * Math.cos(radTilt),
        y: hubPos.y + halfW * Math.sin(radTilt)
      };
      const p2 = {
        x: hubPos.x + halfW * Math.cos(radTilt),
        y: hubPos.y - halfW * Math.sin(radTilt)
      };
      
      const sP1 = toScreen(p1.x, p1.y);
      const sP2 = toScreen(p2.x, p2.y);
      const sHub = toScreen(hubPos.x, hubPos.y);

      // Post
      ctx.beginPath();
      ctx.strokeStyle = '#9ca3af'; 
      ctx.lineWidth = 3;
      ctx.moveTo(sHub.x, groundY);
      ctx.lineTo(sHub.x, sHub.y);
      ctx.stroke();

      // Panel
      ctx.beginPath();
      ctx.strokeStyle = '#e2e8f0'; 
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.moveTo(sP1.x, sP1.y);
      ctx.lineTo(sP2.x, sP2.y);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.moveTo(sP1.x, sP1.y);
      ctx.lineTo(sP2.x, sP2.y);
      ctx.stroke();

      ctx.beginPath();
      ctx.fillStyle = '#fbbf24';
      ctx.arc(sHub.x, sHub.y, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // Scale Indicator
    ctx.fillStyle = '#64748b';
    ctx.font = '10px monospace';
    ctx.fillText(`${(100/scale).toFixed(1)}m`, 10, h - 10);
    ctx.beginPath();
    ctx.strokeStyle = '#64748b';
    ctx.moveTo(10, h-5);
    ctx.lineTo(110, h-5);
    ctx.stroke();

  }, [doy, hour, params]);

  const dateLabel = new Date(2023, 0, doy).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex flex-col gap-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Leaf className="w-5 h-5 text-green-500" />
          Live Shadow Simulator
        </h3>
      </div>

      <div className="relative w-full h-80 bg-slate-900 rounded border border-gray-700 overflow-hidden shadow-inner">
        <canvas 
          ref={canvasRef} 
          width={1000} 
          height={400} 
          className="w-full h-full object-contain cursor-crosshair"
        />
        <div className="absolute bottom-2 left-4 text-xs font-bold text-slate-500 bg-slate-900/50 px-2 rounded">EAST</div>
        <div className="absolute bottom-2 right-4 text-xs font-bold text-slate-500 bg-slate-900/50 px-2 rounded">WEST</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
        <div className="space-y-2">
          <label className="text-xs text-gray-400 flex justify-between">
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3"/> Day of Year</span>
            <span className="text-white">{dateLabel}</span>
          </label>
          <input 
            type="range" 
            min="1" 
            max="365" 
            value={doy} 
            onChange={handleDayChange}
            className="w-full accent-green-500" 
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs text-gray-400 flex justify-between">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> Time of Day</span>
            <span className="text-white">{Math.floor(hour)}:{Math.floor((hour % 1) * 60).toString().padStart(2, '0')}</span>
          </label>
          <input 
            type="range" 
            min="5" 
            max="20" 
            step="0.1"
            value={hour} 
            onChange={handleTimeChange}
            className="w-full accent-yellow-500" 
          />
        </div>
      </div>
    </div>
  );
};

export default ShadowVisualizer;