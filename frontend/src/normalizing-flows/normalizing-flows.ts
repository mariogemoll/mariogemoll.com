import { initWidget } from './widgets/linear-transform';
import { el } from './widgets/web-ui-common/dom';

window.addEventListener('load', () => {
  const linearTransformBox = el(document, '#linear-transform-widget') as HTMLDivElement;
  initWidget(linearTransformBox);
});
