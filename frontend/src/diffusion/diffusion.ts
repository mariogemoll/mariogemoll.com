import { initBrownianMotionWidget } from 'flow-matching-and-diffusion/brownian-motion';
import { initSdeWidget } from 'flow-matching-and-diffusion/sde';
import { el } from 'web-ui-common/dom';

function run(): void {
  const brownianMotionWidget = el(document, '#brownian-motion-widget') as HTMLElement;
  const sdeWidget = el(document, '#sde-widget') as HTMLElement;
  brownianMotionWidget.classList.add('one-chart');
  initBrownianMotionWidget(brownianMotionWidget);
  sdeWidget.classList.add('one-chart', 'with-controls');
  initSdeWidget(sdeWidget);
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    run();
  } catch (error) {
    console.error(error);
    alert(`Error during page setup: ${error instanceof Error ? error.message : String(error)}`);
  }
});
