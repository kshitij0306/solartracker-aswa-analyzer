import { GoogleGenAI } from "@google/genai";
import { SimulationResult, TrackerParams } from '../types';

export const analyzeTrackerConfiguration = async (params: TrackerParams, result: SimulationResult): Promise<string> => {
  if (!process.env.API_KEY) {
    return "API Key not found. Please check your configuration.";
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    You are a Senior Solar Engineer. Analyze the following Single Axis Tracker simulation results.
    
    Parameters:
    - Location: ${params.latitude.toFixed(2)}, ${params.longitude.toFixed(2)}
    - Panel Width (Chord): ${params.panelChord} m
    - Row Spacing (Pitch): ${params.rowSpacing} m
    - Ground Coverage Ratio (GCR): ${(params.panelChord / params.rowSpacing).toFixed(2)}
    - Backtracking Enabled: ${params.backtracking}
    
    Results:
    - Annual Shade-Weighted Area Loss: ${result.shadingLossPercent.toFixed(2)}%
    - Total Integrated Shade Impact: ${Math.round(result.totalASWA)} units
    
    Task:
    1. Explain what "Annual Shade-Weighted Area" means in this specific context (inter-row shading).
    2. Evaluate if a ${(params.panelChord / params.rowSpacing).toFixed(2)} GCR is aggressive or conservative.
    3. Provide 2-3 specific recommendations to reduce the shading loss (e.g., changing pitch, enabling backtracking if off, etc.).
    4. Keep it concise (under 200 words) and professional.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "No analysis could be generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Unable to generate AI analysis at this time. Please try again later.";
  }
};