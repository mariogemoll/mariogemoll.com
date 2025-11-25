import {
  initConditionalProbPathAndVectorFieldWidget,
  initConditionalProbPathWidget
} from 'flow-matching-and-diffusion/conditional';
import {
  initMarginalProbPathAndVectorFieldWidget
} from 'flow-matching-and-diffusion/marginal';
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

  await tf.ready();
  initConditionalProbPathWidget(
    probPathContainer, initialPosition, initialTime, 'conditional-prob-path'
  );
  initConditionalProbPathAndVectorFieldWidget(
    probPathAndVectorFieldContainer, initialPosition, initialTime,
    'conditional-prob-path-and-vector-field'
  );
  initMarginalProbPathAndVectorFieldWidget(
    marginalProbPathAndVectorFieldContainer, 'marginal-prob-path-and-vector-field'
  );
}

window.addEventListener('load', () => {
  page().catch((error: unknown) => {
    console.error(error);
    alert(`Error during page setup: ${error instanceof Error ? error.message : String(error)}`);
  });
});
