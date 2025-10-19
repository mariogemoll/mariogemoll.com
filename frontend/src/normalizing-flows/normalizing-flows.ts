import { initWidget as initLinearTransformWidget } from './widgets/linear-transform';
import { initPipeline } from './widgets/pipeline';
import { el } from './widgets/web-ui-common/dom';

window.addEventListener('load', () => {
  initLinearTransformWidget(el(document, '#linear-transform-widget') as HTMLDivElement);
  initPipeline(
    el(document, '#moons-dataset-widget') as HTMLDivElement,
    el(document, '#training-widget') as HTMLDivElement,
    el(document, '#flow-visualization-widget') as HTMLDivElement,
    '/normalizing-flows/model.json',
    '/normalizing-flows/loss-history.bin'
  ).catch((error: unknown) => {
    console.error('Pipeline initialization error:', error);
  });
});
