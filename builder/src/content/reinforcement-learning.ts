// SPDX-FileCopyrightText: 2026 Mario Gemoll
// SPDX-License-Identifier: 0BSD

import {
  addVisualizations,
  createMarkdownRenderer,
  readMarkdownFile,
  type WidgetTuple } from '../page-helpers.js';
import { type PageContentParams } from '../types.js';
import { highlightJsCssUrl } from './urls.js';

export async function generatePage(
  contentPath: string, pageTitle: string
): Promise<PageContentParams> {
  const md = createMarkdownRenderer({ useHighlightJs: true, useAnchor: true });

  let mdContent = await readMarkdownFile(contentPath, 'reinforcement-learning.md', pageTitle);

  const visualizations: WidgetTuple[] = [
    ['gridworld', 640, 480],
    ['policy-iteration-v', 1000, 480],
    ['policy-iteration-q', 1000, 480],
    ['value-iteration-v', 1000, 480],
    ['value-iteration-q', 1000, 480]
  ];

  mdContent = addVisualizations(mdContent, visualizations);

  const html = md.render(mdContent);

  const cssFiles = [
    highlightJsCssUrl,
    '/misc/centered.css',
    '/misc/widgets.css',
    '/reinforcement-learning/page.css',
    '/reinforcement-learning/ui.css',
    '/reinforcement-learning/reinforcement-learning.css'
  ];

  const jsModuleUrls = ['/reinforcement-learning/reinforcement-learning.js'];

  return [html, cssFiles, [], jsModuleUrls];
}
