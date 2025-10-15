import fsExtra from 'fs-extra';
import MarkdownIt from 'markdown-it';
import mathjax3 from 'markdown-it-mathjax3';
import path from 'path';

import { PAGE_TITLE_PLACEHOLDER_PATTERN } from '../constants.js';
import type { PageContentParams } from '../types.js';

export async function generatePage(
  contentPath: string,
  pageTitle: string
): Promise<PageContentParams> {
  const md = new MarkdownIt({
    html: true,
    linkify: true
  }).use(mathjax3);

  let mdContent = await fsExtra.readFile(
    path.join(contentPath, 'parallel-corpus-viewer.md'), 'utf-8'
  );
  // Replace placeholder with actual page title
  mdContent = mdContent.replace(PAGE_TITLE_PLACEHOLDER_PATTERN, pageTitle);

  const html = md.render(mdContent);
  const cssFiles = [
    '/parallel-corpus-viewer/parallel-corpus-viewer.css'
  ];
  const jsUrls: string[] = [
  ];
  const jsModuleUrls = ['/parallel-corpus-viewer/parallel-corpus-viewer.js'];
  return [html, cssFiles, jsUrls, jsModuleUrls];
}
