import { initGridworldVisualization } from 'reinforcement-learning/visualizations/gridworld';
import {
  initPolicyIterationQVisualization
} from 'reinforcement-learning/visualizations/policy-iteration-q';
import {
  initPolicyIterationVVisualization
} from 'reinforcement-learning/visualizations/policy-iteration-v';
import {
  initValueIterationQVisualization
} from 'reinforcement-learning/visualizations/value-iteration-q';
import {
  initValueIterationVVisualization
} from 'reinforcement-learning/visualizations/value-iteration-v';

function initializeGridWorld(): void {
  const gridworldVizContainer = document.getElementById('gridworld-visualization');
  if (gridworldVizContainer) {
    initGridworldVisualization(gridworldVizContainer);
  }
  const policyIterationVContainer = document.getElementById('policy-iteration-v-visualization');
  if (policyIterationVContainer) {
    initPolicyIterationVVisualization(policyIterationVContainer);
  }
  const policyIterationQContainer = document.getElementById('policy-iteration-q-visualization');
  if (policyIterationQContainer) {
    initPolicyIterationQVisualization(policyIterationQContainer);
  }
  const valueIterationVContainer = document.getElementById('value-iteration-v-visualization');
  if (valueIterationVContainer) {
    initValueIterationVVisualization(valueIterationVContainer);
  }
  const valueIterationQContainer = document.getElementById('value-iteration-q-visualization');
  if (valueIterationQContainer) {
    initValueIterationQVisualization(valueIterationQContainer);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeGridWorld);
} else {
  initializeGridWorld();
}
