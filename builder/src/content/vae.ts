// SPDX-FileCopyrightText: 2025 Mario Gemoll
// SPDX-License-Identifier: 0BSD

import {
  createMarkdownRenderer, readMarkdownFile, replaceWidgetPlaceholders
} from '../page-helpers.js';
import type { PageContentParams } from '../types.js';
import { highlightJsCssUrl, onnxRuntimeWebJsUrl, picaJsUrl } from './urls.js';

export async function generatePage(
  contentPath: string,
  pageTitle: string
): Promise<PageContentParams> {
  const md = createMarkdownRenderer({ useHighlightJs: true });

  let mdContent = await readMarkdownFile(contentPath, 'vae.md', pageTitle);

  const widgets = [
    ['datasetexplanation', 700, 300],
    ['datasetvisualization', 700, 300],
    ['sampling', 700, 300],
    ['mapping', 700, 300],
    ['evolution', 700, 340],
    ['decoding', 700, 300],
    ['modelcomparison', 700, 340]
  ] as const;

  mdContent = replaceWidgetPlaceholders(mdContent, widgets);

  const html = md.render(mdContent);
  const cssFiles = [
    highlightJsCssUrl,
    '/misc/centered.css',
    '/misc/widgets.css',
    '/vae/vae.css'
  ];
  const jsUrls = [
    picaJsUrl,
    onnxRuntimeWebJsUrl
  ];
  const jsModuleUrls = ['/vae/vae.js'];
  return [html, cssFiles, jsUrls, jsModuleUrls];
}
