import { initBrownianMotionWidget } from 'flow-matching-and-diffusion/brownian-motion';
import { initSdeWidget } from 'flow-matching-and-diffusion/sde';
import { el } from 'web-ui-common/dom';

function run(): void {
  const brownianContainer = el(document, '#brownian-motion-widget') as HTMLElement;
  const sdeContainer = el(document, '#sde-widget') as HTMLElement;

  initBrownianMotionWidget(brownianContainer);
  initSdeWidget(sdeContainer);
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    run();
  } catch (error) {
    console.error(error);
    alert(`Error during page setup: ${error instanceof Error ? error.message : String(error)}`);
  }
});
