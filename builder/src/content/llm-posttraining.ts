// SPDX-FileCopyrightText: 2026 Mario Gemoll
// SPDX-License-Identifier: 0BSD

import {
  createMarkdownRenderer, loadPageData, processReferences, readMarkdownFile
} from '../page-helpers.js';
import { type PageContentParams } from '../types.js';
import { highlightJsCssUrl } from './urls.js';

export async function generatePage(
  contentPath: string, pageTitle: string
): Promise<PageContentParams> {
  const md = createMarkdownRenderer({ useHighlightJs: true, useAnchor: true });

  let mdContent = await readMarkdownFile(contentPath, 'llm-posttraining.md', pageTitle);

  const pageData = await loadPageData(contentPath, 'llm-posttraining.json');

  mdContent = processReferences(mdContent, pageData);

  const html = md.render(mdContent);

  const cssFiles = [
    highlightJsCssUrl,
    '/misc/centered.css',
    '/misc/widgets.css'
  ];

  const jsModuleUrls: string[] = [];

  const importMap: Record<string, string> = {
  };

  return [html, cssFiles, [], jsModuleUrls, importMap];
}
