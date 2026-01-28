import React from 'react';
import { SimulationResult, TrackerParams } from '../types';
import { Sparkles, TrendingDown, Sun, Box, Info } from 'lucide-react';
import GroundHeatmap3D from './GroundHeatmap2D';

interface Props {
  result: SimulationResult | null;
  aiAnalysis: string | null;
  isAnalyzing: boolean;
  currentParams: TrackerParams;
}

const ResultsDashboard: React.FC<Props> = ({ result, aiAnalysis, isAnalyzing, currentParams }) => {

  return (
    <div className="flex-1 overflow-y-auto bg-gray-950 p-6">
      <div className="h-full flex flex-col space-y-4">
        
        {!result ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Sun className="w-24 h-24 mb-6 opacity-20" />
            <p className="text-xl font-light">Configure parameters and run simulation.</p>
          </div>
        ) : (
          <>
            {/* KPI Banner */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
              <div className="bg-gray-900 border border-gray-800 p-4 rounded-lg flex flex-col justify-between">
                <div className="flex items-center justify-between">
                   <h3 className="text-gray-400 text-xs font-medium uppercase tracking-wider">Annual Shade Loss</h3>
                   <TrendingDown className="w-4 h-4 text-yellow-500" />
                </div>
                <div className="mt-2">
                  <span className="text-3xl font-bold text-white">{result.shadingLossPercent.toFixed(2)}%</span>
                  <span className="text-xs text-gray-500 ml-2">energy weighted</span>
                </div>
              </div>

              <div className="bg-gray-900 border border-gray-800 p-4 rounded-lg flex flex-col justify-between">
                <div className="flex items-center justify-between">
                   <h3 className="text-gray-400 text-xs font-medium uppercase tracking-wider">Metric ASWA</h3>
                   <Sun className="w-4 h-4 text-orange-500" />
                </div>
                <div className="mt-2">
                  <span className="text-3xl font-bold text-white">{Math.round(result.totalASWA).toLocaleString()}</span>
                  <span className="text-xs text-gray-500 ml-2">Wh/m²</span>
                </div>
              </div>

              <div className="bg-gray-900 border border-gray-800 p-4 rounded-lg flex flex-col relative overflow-hidden">
                 <div className="flex items-center gap-2 mb-1">
                   <Sparkles className="w-4 h-4 text-purple-400" />
                   <h3 className="text-purple-400 text-xs font-bold uppercase tracking-wider">AI Insight</h3>
                 </div>
                 <div className="text-xs text-gray-300 leading-relaxed overflow-y-auto pr-1 custom-scrollbar max-h-20">
                   {isAnalyzing ? "Analyzing..." : aiAnalysis || "No insights."}
                 </div>
              </div>
            </div>
            
            {/* Main Map View - Takes remaining height */}
            <div className="flex-1 bg-gray-900 border border-gray-800 rounded-xl flex flex-col overflow-hidden relative">
               <div className="absolute top-4 left-4 z-10 bg-gray-900/10 pointer-events-none p-2 rounded flex items-center gap-2">
                 <Box className="w-5 h-5 text-sky-500" />
                 <div>
                   <h3 className="text-sm font-bold text-white shadow-black drop-shadow-md">3D Shadow Explorer</h3>
                 </div>
               </div>

               {result.groundHeatmap2D && (
                 <GroundHeatmap3D mapData={result.groundHeatmap2D} params={currentParams} />
               )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ResultsDashboard;