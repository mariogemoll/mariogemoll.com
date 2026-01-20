// SPDX-FileCopyrightText: 2025 Mario Gemoll
// SPDX-License-Identifier: 0BSD

import { initWidget as initLayersWidget } from 'normalizing-flows/layers';
import { initWidget as initLinearTransformWidget } from 'normalizing-flows/linear-transform';
import { initNormalizingFlowPipeline } from 'normalizing-flows/pipeline';
import { el } from 'web-ui-common/dom';

window.addEventListener('load', () => {
  initLinearTransformWidget(el(document, '#linear-transform-widget') as HTMLDivElement);
  initLayersWidget(el(document, '#layers-widget') as HTMLDivElement);
  initNormalizingFlowPipeline(
    el(document, '#moons-dataset-widget') as HTMLDivElement,
    el(document, '#training-widget') as HTMLDivElement,
    el(document, '#flow-visualization-widget') as HTMLDivElement,
    '/normalizing-flows/model.json',
    '/normalizing-flows/loss-history.bin'
  ).catch((error: unknown) => {
    console.error('Pipeline initialization error:', error);
  });
});
