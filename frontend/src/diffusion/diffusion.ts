// SPDX-FileCopyrightText: 2025 Mario Gemoll
// SPDX-License-Identifier: 0BSD

import {
  initBrownianMotionVisualization
} from 'flow-matching-and-diffusion/visualizations/brownian-motion';
import {
  initConditionalPathOdeSdeVisualization
} from 'flow-matching-and-diffusion/visualizations/conditional/path-ode-sde';
import {
  initDiffusionVisualizationEnsemble
} from 'flow-matching-and-diffusion/visualizations/ensembles/diffusion';
import {
  initEulerMaruyamaMethodVisualization
} from 'flow-matching-and-diffusion/visualizations/euler-maruyama-method';
import {
  initMarginalPathOdeSdeVisualization
} from 'flow-matching-and-diffusion/visualizations/marginal/path-ode-sde';
import { el } from 'web-ui-common/dom';

function initViz(fn: (el: HTMLElement) => () => void, selector: string): void {
  const container = document.querySelector<HTMLElement>(selector);
  if (!container) {
    throw new Error(`Container not found for selector: ${selector}`);
  }
  fn(container);
}

async function run(): Promise<void> {
  initViz(initBrownianMotionVisualization, '#brownian-motion-visualization');
  initViz(initEulerMaruyamaMethodVisualization, '#euler-maruyama-method-visualization');
  initViz(
    initConditionalPathOdeSdeVisualization, '#conditional-probability-path-ode-sde-visualization'
  );
  initViz(initMarginalPathOdeSdeVisualization, '#marginal-probability-path-ode-sde-visualization');

  const moonsDatasetContainer = el(
    document, '#moons-dataset-visualization') as HTMLDivElement;
  const flowMatchingTrainingContainer = el(
    document, '#flow-matching-training-visualization') as HTMLDivElement;
  const scoreMatchingTrainingContainer = el(
    document, '#score-matching-training-visualization') as HTMLDivElement;
  const diffusionVisualizationContainer = el(
    document, '#diffusion-inference-visualization') as HTMLDivElement;

  await tf.ready();

  initDiffusionVisualizationEnsemble(
    moonsDatasetContainer,
    flowMatchingTrainingContainer,
    scoreMatchingTrainingContainer,
    diffusionVisualizationContainer,
    {
      flowMatchingWeightsUrl: '/flow-matching/flow-matching-model.json',
      flowMatchingLossHistoryUrl: '/flow-matching/flow-matching-loss-history.bin',
      scoreMatchingWeightsUrl: '/diffusion/score-matching-model.json',
      scoreMatchingLossHistoryUrl: '/diffusion/score-matching-loss-history.bin'
    }
  );
}

document.addEventListener('DOMContentLoaded', () => {
  run().catch((error: unknown) => {
    console.error(error);
    alert(`Error during page setup: ${error instanceof Error ? error.message : String(error)}`);
  });
});
