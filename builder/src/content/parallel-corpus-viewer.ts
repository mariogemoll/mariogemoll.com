// SPDX-FileCopyrightText: 2025 Mario Gemoll
// SPDX-License-Identifier: 0BSD

import { createMarkdownRenderer, readMarkdownFile } from '../page-helpers.js';
import type { PageContentParams } from '../types.js';

export async function generatePage(
  contentPath: string,
  pageTitle: string
): Promise<PageContentParams> {
  const md = createMarkdownRenderer();

  const mdContent = await readMarkdownFile(contentPath, 'parallel-corpus-viewer.md', pageTitle);

  const html = md.render(mdContent);
  const cssFiles = [
    '/parallel-corpus-viewer/parallel-corpus-viewer.css'
  ];
  const jsUrls: string[] = [
  ];
  const jsModuleUrls = ['/parallel-corpus-viewer/parallel-corpus-viewer.js'];
  return [html, cssFiles, jsUrls, jsModuleUrls];
}
