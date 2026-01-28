# SolarTracker ASWA Analyzer

A browser-based simulator for single-axis solar trackers that estimates annual shading impacts and visualizes ground-level shade patterns. It lets you tune array geometry, tracker behavior, and simulation windows, then reports shade-weighted losses with an optional AI summary.

## What it does
- Simulates yearly sun positions for a site and computes inter-row shading.
- Calculates Annual Shade-Weighted Area (ASWA) and energy-weighted shading loss.
- Renders a ground heatmap / 3D shadow explorer to inspect shade patterns.
- Generates concise Gemini-based design insights (optional).

## Inputs you can adjust
- Location (latitude, longitude)
- Panel chord (width)
- Tracker length
- Row spacing (pitch) and number of rows
- Hub height
- Max rotation and backtracking toggle
- Simulation time window (start/end hour)

## Outputs
- Annual shade loss percentage (energy weighted)
- Total ASWA metric (Wh/m²)
- Ground shading heatmap and 3D visualizer
- AI recommendations for reducing shade loss (when enabled)

## Run locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create `.env.local` with your API key (optional for AI insights):
   ```bash
   API_KEY=your_gemini_api_key
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```
