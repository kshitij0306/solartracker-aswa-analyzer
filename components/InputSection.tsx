import React from 'react';
import { TrackerParams } from '../types';
import { Settings2, MapPin, Maximize, ArrowLeftRight, RotateCw, RefreshCw, Layers, ArrowUpFromLine, Ruler, Clock } from 'lucide-react';

interface Props {
  params: TrackerParams;
  onChange: (newParams: TrackerParams) => void;
  onSimulate: () => void;
  isCalculating: boolean;
}

const InputSection: React.FC<Props> = ({ params, onChange, onSimulate, isCalculating }) => {
  
  const handleChange = (key: keyof TrackerParams, value: number | boolean) => {
    onChange({ ...params, [key]: value });
  };

  return (
    <div className="bg-gray-900 border-r border-gray-800 p-6 flex flex-col h-full w-full md:w-80 lg:w-96 overflow-y-auto">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Settings2 className="w-6 h-6 text-yellow-500" />
          SolarTracker <span className="text-yellow-500">Pro</span>
        </h1>
        <p className="text-gray-400 text-sm mt-2">Annual Shade-Weighted Area Analyzer</p>
      </div>

      <div className="space-y-6 flex-1">
        {/* Location Group */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
            <MapPin className="w-4 h-4" /> Location
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Latitude</label>
              <input
                type="number"
                value={params.latitude}
                onChange={(e) => handleChange('latitude', parseFloat(e.target.value))}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:border-yellow-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Longitude</label>
              <input
                type="number"
                value={params.longitude}
                onChange={(e) => handleChange('longitude', parseFloat(e.target.value))}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:border-yellow-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Geometry Group */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
            <Maximize className="w-4 h-4" /> Geometry
          </h3>
          
          <div>
            <label className="text-xs text-gray-400 mb-1 block flex justify-between">
              <span>Panel Chord (Width)</span>
              <span className="text-yellow-500">{params.panelChord} m</span>
            </label>
            <input
              type="range"
              min="1"
              max="5"
              step="0.1"
              value={params.panelChord}
              onChange={(e) => handleChange('panelChord', parseFloat(e.target.value))}
              className="w-full accent-yellow-500"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block flex justify-between">
              <span className="flex items-center gap-1"><Ruler className="w-3 h-3"/> Tracker Length</span>
              <span className="text-yellow-500">{params.trackerLength} m</span>
            </label>
            <input
              type="range"
              min="5"
              max="100"
              step="1"
              value={params.trackerLength}
              onChange={(e) => handleChange('trackerLength', parseFloat(e.target.value))}
              className="w-full accent-yellow-500"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block flex justify-between">
              <span>Row Spacing (Pitch)</span>
              <span className="text-yellow-500">{params.rowSpacing} m</span>
            </label>
            <input
              type="range"
              min="3"
              max="15"
              step="0.5"
              value={params.rowSpacing}
              onChange={(e) => handleChange('rowSpacing', parseFloat(e.target.value))}
              className="w-full accent-yellow-500"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block flex justify-between">
              <span className="flex items-center gap-1"><ArrowUpFromLine className="w-3 h-3"/> Hub Height</span>
              <span className="text-yellow-500">{params.hubHeight} m</span>
            </label>
            <input
              type="range"
              min="1"
              max="4"
              step="0.1"
              value={params.hubHeight}
              onChange={(e) => handleChange('hubHeight', parseFloat(e.target.value))}
              className="w-full accent-yellow-500"
            />
          </div>
          
           <div>
            <label className="text-xs text-gray-400 mb-1 block flex justify-between">
              <span className="flex items-center gap-1"><Layers className="w-3 h-3"/> Number of Rows</span>
              <span className="text-yellow-500">{params.numberOfRows}</span>
            </label>
            <input
              type="range"
              min="1"
              max="20"
              step="1"
              value={params.numberOfRows}
              onChange={(e) => handleChange('numberOfRows', parseInt(e.target.value))}
              className="w-full accent-yellow-500"
            />
          </div>

          <div className="bg-gray-800/50 p-3 rounded border border-gray-700">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-300">GCR (Ground Cover Ratio)</span>
              <span className={`text-sm font-bold ${(params.panelChord / params.rowSpacing) > 0.5 ? 'text-red-400' : 'text-green-400'}`}>
                {((params.panelChord / params.rowSpacing) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Time Window Settings */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4" /> Simulation Window
          </h3>
          
          <div>
             <div className="flex justify-between items-end mb-2">
                <label className="text-xs text-gray-400">Time Range</label>
                <span className="text-yellow-500 font-mono text-xs font-bold">
                  {params.startTime}:00 - {params.endTime}:00
                </span>
             </div>
             
             <div className="space-y-3 px-1">
                <div>
                   <label className="text-[10px] text-gray-500 block mb-1">Start Time (Hour)</label>
                   <input
                    type="range"
                    min="0"
                    max="23"
                    step="1"
                    value={params.startTime}
                    onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if(val < params.endTime) handleChange('startTime', val);
                    }}
                    className="w-full accent-yellow-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-gray-600 mt-1">
                     <span>00:00</span>
                     <span>23:00</span>
                  </div>
                </div>
                <div>
                   <label className="text-[10px] text-gray-500 block mb-1">End Time (Hour)</label>
                   <input
                    type="range"
                    min="1"
                    max="24"
                    step="1"
                    value={params.endTime}
                    onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if(val > params.startTime) handleChange('endTime', val);
                    }}
                    className="w-full accent-yellow-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-gray-600 mt-1">
                     <span>01:00</span>
                     <span>24:00</span>
                  </div>
                </div>
             </div>
          </div>
        </div>

        {/* Tracker Settings */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
            <RotateCw className="w-4 h-4" /> Tracker
          </h3>
          
          <div>
            <label className="text-xs text-gray-400 mb-1 block flex justify-between">
              <span>Max Rotation</span>
              <span className="text-yellow-500">+/- {params.maxRotation}°</span>
            </label>
            <input
              type="range"
              min="30"
              max="75"
              step="5"
              value={params.maxRotation}
              onChange={(e) => handleChange('maxRotation', parseFloat(e.target.value))}
              className="w-full accent-yellow-500"
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-800 rounded border border-gray-700 cursor-pointer"
               onClick={() => handleChange('backtracking', !params.backtracking)}>
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-200">Backtracking</span>
            </div>
            <div className={`w-10 h-5 rounded-full relative transition-colors ${params.backtracking ? 'bg-yellow-500' : 'bg-gray-600'}`}>
              <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-transform ${params.backtracking ? 'left-6' : 'left-1'}`} />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-gray-800">
        <button
          onClick={onSimulate}
          disabled={isCalculating}
          className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 rounded flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCalculating ? (
            <RefreshCw className="w-5 h-5 animate-spin" />
          ) : (
            "Run Simulation"
          )}
        </button>
      </div>
    </div>
  );
};

export default InputSection;