import {
  initConditionalProbPathAndVectorFieldWidget,
  initConditionalProbPathWidget
} from 'flow-matching-and-diffusion/conditional';
import { initFlowMatchingPipeline } from 'flow-matching-and-diffusion/flow-matching-pipeline';
import {
  initMarginalProbPathAndVectorFieldWidget
} from 'flow-matching-and-diffusion/marginal';
import { initEulerMethodWidget, initVectorFieldWidget } from 'flow-matching-and-diffusion/vf';
import { el } from 'web-ui-common/dom';
import type { Pair } from 'web-ui-common/types';

async function page(): Promise<void> {
  const probPathContainer = el(document, '#conditional-prob-path-widget') as HTMLElement;
  const probPathAndVectorFieldContainer = el(
    document,
    '#conditional-prob-path-and-vector-field-widget'
  ) as HTMLElement;
  const marginalProbPathAndVectorFieldContainer = el(
    document,
    '#marginal-prob-path-and-vector-field-widget'
  ) as HTMLElement;

  const initialPosition: Pair<number> = [1.0, 0.5];
  const initialTime = 0;

  initVectorFieldWidget(el(document, '#vector-field-widget') as HTMLDivElement);
  initEulerMethodWidget(el(document, '#euler-method-widget') as HTMLDivElement);

  await tf.ready();

  initConditionalProbPathWidget( probPathContainer, initialPosition, initialTime);
  initConditionalProbPathAndVectorFieldWidget(
    probPathAndVectorFieldContainer, initialPosition, initialTime
  );
  initMarginalProbPathAndVectorFieldWidget(marginalProbPathAndVectorFieldContainer);
  await initFlowMatchingPipeline(
    el(document, '#moons-dataset-widget') as HTMLDivElement,
    el(document, '#training-widget') as HTMLDivElement,
    el(document, '#flow-visualization-widget') as HTMLDivElement,
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
