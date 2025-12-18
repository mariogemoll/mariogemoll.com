import { initBrownianMotionWidget } from 'flow-matching-and-diffusion/brownian-motion';
import { initConditionalPathOdeSdeWidget } from 'flow-matching-and-diffusion/conditional';
import { initMarginalPathOdeSdeWidget } from 'flow-matching-and-diffusion/marginal';
import { initSdeWidget } from 'flow-matching-and-diffusion/sde';
import { el } from 'web-ui-common/dom';

function run(): void {
  const brownianMotionWidget = el(document, '#brownian-motion-widget') as HTMLElement;
  const sdeWidget = el(document, '#sde-widget') as HTMLElement;
  const conditionalPathOdeSdeWidget = el(
    document, '#conditional-path-ode-sde-widget'
  ) as HTMLElement;
  const marginalPathOdeSdeWidget = el(
    document, '#marginal-path-ode-sde-widget'
  ) as HTMLElement;

  brownianMotionWidget.classList.add('one-chart');
  initBrownianMotionWidget(brownianMotionWidget);
  sdeWidget.classList.add('one-chart', 'with-controls');
  initSdeWidget(sdeWidget);
  conditionalPathOdeSdeWidget.classList.add('three-charts', 'with-controls');
  initConditionalPathOdeSdeWidget(conditionalPathOdeSdeWidget);
  marginalPathOdeSdeWidget.classList.add('three-charts', 'with-controls');
  initMarginalPathOdeSdeWidget(marginalPathOdeSdeWidget);
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    run();
  } catch (error) {
    console.error(error);
    alert(`Error during page setup: ${error instanceof Error ? error.message : String(error)}`);
  }
});
