import { initCartPoleVisualization } from 'reinforcement-learning/visualizations/cartpole';
import { initGridworldVisualization } from 'reinforcement-learning/visualizations/gridworld';
import {
  initMinAtarBreakoutVisualization
} from 'reinforcement-learning/visualizations/minatar-breakout';
import { initMonteCarloVisualization } from 'reinforcement-learning/visualizations/monte-carlo';
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
  const monteCarloContainer = document.getElementById('monte-carlo-visualization');
  if (monteCarloContainer) {
    initMonteCarloVisualization(monteCarloContainer);
  }
  const cartpoleDqnContainer = document.getElementById('cartpole-visualization');
  if (cartpoleDqnContainer) {
    void initCartPoleVisualization(
      cartpoleDqnContainer, '/reinforcement-learning/cartpole.safetensors'
    );
  }
  const breakoutContainer = document.getElementById('breakout-visualization');
  if (breakoutContainer) {
    void initMinAtarBreakoutVisualization(
      breakoutContainer, '/reinforcement-learning/minatar-breakout.safetensors'
    );
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeGridWorld);
} else {
  initializeGridWorld();
}
