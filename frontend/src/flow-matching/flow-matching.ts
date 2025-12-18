import {
  initConditionalPathOdeWidget,
  initConditionalPathWidget } from 'flow-matching-and-diffusion/conditional';
import { initFlowMatchingPipeline } from 'flow-matching-and-diffusion/flow-matching-pipeline';
import { initMarginalPathOdeWidget } from 'flow-matching-and-diffusion/marginal';
import { initEulerMethodWidget, initVectorFieldWidget } from 'flow-matching-and-diffusion/vf';
import { el } from 'web-ui-common/dom';
import type { Pair } from 'web-ui-common/types';

async function page(): Promise<void> {
  const vectorFieldWidget = el(document, '#vector-field-widget') as HTMLDivElement;
  const eulerMethodWidget = el(document, '#euler-method-widget') as HTMLDivElement;
  const probPathWidget = el(document, '#conditional-prob-path-widget') as HTMLElement;
  const probPathAndVectorFieldWidget = el(
    document,
    '#conditional-prob-path-and-vector-field-widget'
  ) as HTMLElement;
  const marginalProbPathAndVectorFieldWidget = el(
    document,
    '#marginal-prob-path-and-vector-field-widget'
  ) as HTMLElement;
  const moonsDatasetWidget = el(document, '#moons-dataset-widget') as HTMLDivElement;
  const trainingWidget = el(document, '#training-widget') as HTMLDivElement;
  const flowVisualizationWidget = el(document, '#flow-visualization-widget') as HTMLDivElement;

  vectorFieldWidget.classList.add('one-chart', 'with-controls');
  initVectorFieldWidget(vectorFieldWidget);

  eulerMethodWidget.classList.add('one-chart', 'with-controls');
  initEulerMethodWidget(eulerMethodWidget);

  const initialPosition: Pair<number> = [1.0, 0.5];
  const initialTime = 0;

  await tf.ready();

  probPathWidget.classList.add('one-chart', 'with-controls');
  initConditionalPathWidget(probPathWidget, initialPosition, initialTime);

  probPathAndVectorFieldWidget.classList.add('two-charts', 'with-controls');
  initConditionalPathOdeWidget(
    probPathAndVectorFieldWidget, initialPosition, initialTime
  );
  marginalProbPathAndVectorFieldWidget.classList.add('two-charts', 'with-controls');
  initMarginalPathOdeWidget(marginalProbPathAndVectorFieldWidget);

  await initFlowMatchingPipeline(
    moonsDatasetWidget,
    trainingWidget,
    flowVisualizationWidget,
    '/flow-matching/flow-matching-model.json',
    '/flow-matching/flow-matching-loss-history.bin',
    1000 // epochs
  );
}

window.addEventListener('load', () => {
  page().catch((error: unknown) => {
    console.error(error);
    alert(`Error during page setup: ${error instanceof Error ? error.message : String(error)}`);
  });
});
