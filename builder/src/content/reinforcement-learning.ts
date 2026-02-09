// SPDX-FileCopyrightText: 2026 Mario Gemoll
// SPDX-License-Identifier: 0BSD

import {
  createMarkdownRenderer,
  readMarkdownFile
} from '../page-helpers.js';
import { type PageContentParams } from '../types.js';
import { highlightJsCssUrl } from './urls.js';

export async function generatePage(
  contentPath: string, pageTitle: string
): Promise<PageContentParams> {
  const md = createMarkdownRenderer({ useHighlightJs: true, useAnchor: true });

  const mdContent = await readMarkdownFile(contentPath, 'reinforcement-learning.md', pageTitle);

  const html = md.render(mdContent);

  const cssFiles = [
    highlightJsCssUrl,
    '/misc/centered.css'
  ];

  return [html, cssFiles, [], []];
}
