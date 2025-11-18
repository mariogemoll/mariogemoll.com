import { el } from 'web-ui-common/dom';
import type { Pair } from 'web-ui-common/types';

import { initConditionalProbPathWidget } from './fmad/conditional';

async function page(): Promise<void> {
  const container = el(document, '#conditional-prob-path-widget') as HTMLElement;

  const initialPosition: Pair<number> = [1.0, 0.5];
  const initialTime = 0;

  await tf.ready();
  initConditionalProbPathWidget(container, initialPosition, initialTime);
}

window.addEventListener('load', () => {
  page().catch((error: unknown) => {
    console.error(error);
    alert(`Error during page setup: ${error instanceof Error ? error.message : String(error)}`);
  });
});
