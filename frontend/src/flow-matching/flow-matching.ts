// SPDX-FileCopyrightText: 2025 Mario Gemoll
// SPDX-License-Identifier: 0BSD

import {
  initConditionalPathVisualization
} from 'flow-matching-and-diffusion/visualizations/conditional/path';
import {
  initConditionalPathOdeVisualization
} from 'flow-matching-and-diffusion/visualizations/conditional/path-ode';
import {
  initFlowMatchingVisualizationEnsemble
} from 'flow-matching-and-diffusion/visualizations/ensembles/flow-matching';
import {
  initEulerMethodVisualization
} from 'flow-matching-and-diffusion/visualizations/euler-method';
import {
  initMarginalPathOdeVisualization
} from 'flow-matching-and-diffusion/visualizations/marginal/path-ode';
import {
  initVectorFieldVisualization
} from 'flow-matching-and-diffusion/visualizations/vector-field';
import { el } from 'web-ui-common/dom';

function initViz(fn: (el: HTMLElement) => () => void, selector: string): void {
  const container = document.querySelector<HTMLElement>(selector);
  if (!container) {
    throw new Error(`Container not found for selector: ${selector}`);
  }
  fn(container);
}

async function page(): Promise<void> {
  initViz(initVectorFieldVisualization, '#vector-field-visualization');
  initViz(initEulerMethodVisualization, '#euler-method-visualization');
  initViz(initConditionalPathVisualization, '#conditional-probability-path-visualization');
  initViz(initConditionalPathOdeVisualization, '#conditional-probability-path-ode-visualization');
  initViz(initMarginalPathOdeVisualization, '#marginal-probability-path-ode-visualization');

  const moonsDatasetVisualization = el(document, '#moons-dataset-visualization') as HTMLDivElement;
  const trainingVisualization = el(
    document, '#flow-matching-training-visualization'
  ) as HTMLDivElement;
  const flowVisualization = el(
    document, '#flow-matching-inference-visualization'
  ) as HTMLDivElement;

  await tf.ready();

  initFlowMatchingVisualizationEnsemble(
    moonsDatasetVisualization,
    trainingVisualization,
    flowVisualization,
    {
      weightsUrl: '/flow-matching/flow-matching-model.json',
      lossHistoryUrl: '/flow-matching/flow-matching-loss-history.bin'
    }
  );
}

window.addEventListener('load', () => {
  page().catch((error: unknown) => {
    console.error(error);
    alert(`Error during page setup: ${error instanceof Error ? error.message : String(error)}`);
  });
});
