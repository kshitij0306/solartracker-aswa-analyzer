import React, { useState } from 'react';
import InputSection from './components/InputSection';
import ResultsDashboard from './components/ResultsDashboard';
import { TrackerParams, SimulationResult } from './types';
import { simulateYear } from './utils/solarPhysics';
import { analyzeTrackerConfiguration } from './services/geminiService';

const App: React.FC = () => {
  // Default to Portland, ME as requested
  const [params, setParams] = useState<TrackerParams>({
    latitude: 43.66,
    longitude: -70.25,
    panelChord: 2.0, // Meters
    trackerLength: 20.0, // Meters
    rowSpacing: 5.0, // Meters (GCR ~40%)
    hubHeight: 1.5, // Meters
    backtracking: false, // Default off to see shading effects
    maxRotation: 60, // Degrees
    numberOfRows: 5, // Default number of rows
    startTime: 10, // Default 10 AM
    endTime: 15 // Default 3 PM
  });

  const [result, setResult] = useState<SimulationResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleSimulate = async () => {
    setIsCalculating(true);
    setResult(null);
    setAiAnalysis(null);

    // Use setTimeout to allow the UI to render the loading state before the heavy calculation
    setTimeout(async () => {
      try {
        // 1. Run Physics Simulation
        const simulationResult = simulateYear(params);
        setResult(simulationResult);
        setIsCalculating(false);

        // 2. Trigger Gemini Analysis
        setIsAnalyzing(true);
        try {
          const analysis = await analyzeTrackerConfiguration(params, simulationResult);
          setAiAnalysis(analysis);
        } catch (error) {
          console.error("AI Analysis failed", error);
          setAiAnalysis("Failed to generate AI insights.");
        } finally {
          setIsAnalyzing(false);
        }

      } catch (error) {
        console.error("Simulation failed", error);
        setIsCalculating(false);
      }
    }, 100);
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen overflow-hidden bg-gray-950 text-white">
      {/* Sidebar / Input Section */}
      <InputSection 
        params={params} 
        onChange={setParams} 
        onSimulate={handleSimulate}
        isCalculating={isCalculating}
      />

      {/* Main Content / Results */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <ResultsDashboard 
          result={result} 
          aiAnalysis={aiAnalysis}
          isAnalyzing={isAnalyzing}
          currentParams={params}
        />
      </main>
    </div>
  );
};

export default App;