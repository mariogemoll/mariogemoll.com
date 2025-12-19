import { initBrownianMotionWidget } from 'flow-matching-and-diffusion/brownian-motion';
import { initConditionalPathOdeSdeWidget } from 'flow-matching-and-diffusion/conditional';
import {
  initFlowAndScoreMatchingPipeline
} from 'flow-matching-and-diffusion/flow-and-score-matching-pipeline';
import { initMarginalPathOdeSdeWidget } from 'flow-matching-and-diffusion/marginal';
import { initSdeWidget } from 'flow-matching-and-diffusion/sde';
import { el } from 'web-ui-common/dom';

async function run(): Promise<void> {
  const brownianMotionWidget = el(document, '#brownian-motion-widget') as HTMLElement;
  const sdeWidget = el(document, '#sde-widget') as HTMLElement;
  const conditionalPathOdeSdeWidget = el(
    document, '#conditional-path-ode-sde-widget'
  ) as HTMLElement;
  const marginalPathOdeSdeWidget = el(
    document, '#marginal-path-ode-sde-widget'
  ) as HTMLElement;
  const moonsDatasetContainer = el(
    document, '#moons-dataset-widget') as HTMLDivElement;
  const flowMatchingTrainingContainer = el(
    document, '#flow-matching-training-widget') as HTMLDivElement;
  const scoreMatchingTrainingContainer = el(
    document, '#score-matching-training-widget') as HTMLDivElement;
  const diffusionVisualizationContainer = el(
    document, '#diffusion-visualization-widget') as HTMLDivElement;

  brownianMotionWidget.classList.add('one-chart');
  initBrownianMotionWidget(brownianMotionWidget);
  sdeWidget.classList.add('one-chart', 'with-controls');
  initSdeWidget(sdeWidget);
  conditionalPathOdeSdeWidget.classList.add('three-charts', 'with-controls');
  initConditionalPathOdeSdeWidget(conditionalPathOdeSdeWidget);
  marginalPathOdeSdeWidget.classList.add('three-charts', 'with-controls');
  initMarginalPathOdeSdeWidget(marginalPathOdeSdeWidget);
  await initFlowAndScoreMatchingPipeline(
    moonsDatasetContainer,
    flowMatchingTrainingContainer,
    scoreMatchingTrainingContainer,
    diffusionVisualizationContainer,
    '/flow-matching/flow-matching-model.json',
    '/flow-matching/flow-matching-loss-history.bin',
    '/diffusion/score-matching-model.json',
    '/diffusion/score-matching-loss-history.bin'
  );
}

document.addEventListener('DOMContentLoaded', () => {
  run().catch((error: unknown) => {
    console.error(error);
    alert(`Error during page setup: ${error instanceof Error ? error.message : String(error)}`);
  });
});
