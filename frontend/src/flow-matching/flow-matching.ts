import { el } from 'web-ui-common/dom';
import type { Pair } from 'web-ui-common/types';

import {
  initConditionalProbPathAndVectorFieldWidget,
  initConditionalProbPathWidget } from './fmad/conditional';

async function page(): Promise<void> {
  const probPathContainer = el(document, '#conditional-prob-path-widget') as HTMLElement;
  const probPathAndVectorFieldContainer = el(
    document,
    '#conditional-prob-path-and-vector-field-widget'
  ) as HTMLElement;

  const initialPosition: Pair<number> = [1.0, 0.5];
  const initialTime = 0;

  await tf.ready();
  initConditionalProbPathWidget(probPathContainer, initialPosition, initialTime);
  initConditionalProbPathAndVectorFieldWidget(
    probPathAndVectorFieldContainer, initialPosition, initialTime
  );
}

window.addEventListener('load', () => {
  page().catch((error: unknown) => {
    console.error(error);
    alert(`Error during page setup: ${error instanceof Error ? error.message : String(error)}`);
  });
});
