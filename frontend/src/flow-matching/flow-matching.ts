// SPDX-FileCopyrightText: 2025 Mario Gemoll
// SPDX-License-Identifier: 0BSD

import {
  initConditionalPathVisualization
} from 'flow-matching-and-diffusion/visualizations/conditional/path';
import {
  initConditionalPathOdeVisualization
} from 'flow-matching-and-diffusion/visualizations/conditional/path-ode';
import {
  initEulerMethodVisualization
} from 'flow-matching-and-diffusion/visualizations/euler-method';
import {
  initMarginalPathOdeVisualization
} from 'flow-matching-and-diffusion/visualizations/marginal/path-ode';
import {
  initVectorFieldVisualization
} from 'flow-matching-and-diffusion/visualizations/vector-field';
import {
  initFlowMatchingPipeline
} from 'flow-matching-and-diffusion-deprecated/flow-matching-pipeline';
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

  const moonsDatasetWidget = el(document, '#moons-dataset-widget') as HTMLDivElement;
  const trainingWidget = el(document, '#training-widget') as HTMLDivElement;
  const flowVisualizationWidget = el(document, '#flow-visualization-widget') as HTMLDivElement;

  await tf.ready();

  await initFlowMatchingPipeline(
    moonsDatasetWidget,
    trainingWidget,
    flowVisualizationWidget,
    '/flow-matching/flow-matching-model.json',
    '/flow-matching/flow-matching-loss-history.bin',
    1000 // epochs
  );
  await Promise.resolve();
}

window.addEventListener('load', () => {
  page().catch((error: unknown) => {
    console.error(error);
    alert(`Error during page setup: ${error instanceof Error ? error.message : String(error)}`);
  });
});
