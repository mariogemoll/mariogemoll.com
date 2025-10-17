import { initWidget as initLinearTransformWidget } from './widgets/linear-transform';
import { initWidget as initDatasetWidget } from './widgets/moons-widget';
import { createPageState } from './widgets/page-state';
import { el } from './widgets/web-ui-common/dom';

window.addEventListener('load', () => {
  initLinearTransformWidget(el(document, '#linear-transform-widget') as HTMLDivElement);
  const state = createPageState(8, 1000); // 8 layers, 1000 epochs
  initDatasetWidget(el(document, '#dataset-widget') as HTMLDivElement, state);
});
