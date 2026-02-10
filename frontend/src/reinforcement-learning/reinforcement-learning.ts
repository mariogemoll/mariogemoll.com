import {
  type GridworldVisualization,initGridworldVisualization
} from 'reinforcement-learning/visualizations/gridworld';

let gridworldVisualization: GridworldVisualization | null = null;

function initializeGridWorld(): void {
  const panel = document.getElementById('gridworld-visualization');
  if (!panel) {
    return;
  }

  gridworldVisualization?.destroy();
  gridworldVisualization = initGridworldVisualization(panel);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeGridWorld);
} else {
  initializeGridWorld();
}
