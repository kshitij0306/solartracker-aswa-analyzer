import React, { useRef, useEffect } from 'react';
import { HeatmapPoint } from '../types';

interface Props {
  data: HeatmapPoint[];
}

const ShadingHeatmap: React.FC<Props> = ({ data }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Dimensions
    // X Axis: Hour 5 to 21 (16 hours)
    // Y Axis: Day 0 to 365
    
    const minHour = 5;
    const maxHour = 21;
    const totalHours = maxHour - minHour;
    
    const cellWidth = width / totalHours;
    const cellHeight = height / 365;

    ctx.clearRect(0, 0, width, height);
    
    // Background (White/Empty)
    ctx.fillStyle = '#111827'; // gray-900 base
    ctx.fillRect(0, 0, width, height);

    data.forEach(pt => {
      const x = (pt.hour - minHour) * cellWidth;
      const y = pt.day * cellHeight;
      
      // Color Mapping: Red (0%) -> Blue (100%)
      // User requested: Least shadow = Red, Most shadow = Blue.
      // We interpret this as a gradient.
      // 0.0 -> Red (255, 0, 0)
      // 0.5 -> Purple (128, 0, 128)
      // 1.0 -> Blue (0, 0, 255)
      
      const t = pt.shading;
      const r = Math.floor(255 * (1 - t));
      const g = 0;
      const b = Math.floor(255 * t);
      
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      // Use slightly larger rect to avoid gaps
      ctx.fillRect(x, y, cellWidth + 0.5, cellHeight + 0.5);
    });

  }, [data]);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex justify-between items-center mb-2 px-1">
         <span className="text-xs text-gray-400">Day 0 (Jan 1)</span>
         <span className="text-xs text-gray-400">Day 365 (Dec 31)</span>
      </div>
      <div className="relative flex-1 min-h-0 bg-gray-900 border border-gray-800 rounded overflow-hidden">
        <canvas 
          ref={canvasRef} 
          width={600} 
          height={300} 
          className="w-full h-full"
        />
        {/* Axis Labels Overlay */}
        <div className="absolute top-2 left-2 text-xs font-bold text-white bg-black/50 px-1 rounded">Winter</div>
        <div className="absolute bottom-2 left-2 text-xs font-bold text-white bg-black/50 px-1 rounded">Winter</div>
        <div className="absolute top-1/2 left-2 text-xs font-bold text-white bg-black/50 px-1 rounded -translate-y-1/2">Summer</div>
      </div>
      <div className="flex justify-between items-center mt-1 px-1">
         <span className="text-xs text-gray-400">5:00 AM</span>
         <span className="text-xs text-gray-400">Noon</span>
         <span className="text-xs text-gray-400">9:00 PM</span>
      </div>
       <div className="flex items-center justify-center gap-2 mt-2">
         <span className="text-xs text-red-500 font-bold">0% Shade</span>
         <div className="w-24 h-2 bg-gradient-to-r from-red-600 via-purple-600 to-blue-600 rounded"></div>
         <span className="text-xs text-blue-500 font-bold">100% Shade</span>
      </div>
    </div>
  );
};

export default ShadingHeatmap;