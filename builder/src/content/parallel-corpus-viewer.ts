import fsExtra from 'fs-extra';
import MarkdownIt from 'markdown-it';
import mathjax3 from 'markdown-it-mathjax3';
import path from 'path';

import type { PageContentParams } from '../types.js';

export async function generatePage(contentPath: string): Promise<PageContentParams> {
  const md = new MarkdownIt({
    html: true,
    linkify: true
  }).use(mathjax3);

  const mdContent = await fsExtra.readFile(
    path.join(contentPath, 'parallel-corpus-viewer.md'), 'utf-8'
  );

  const html = md.render(mdContent);
  const cssFiles = [
    '/parallel-corpus-viewer/parallel-corpus-viewer.css'
  ];
  const jsUrls: string[] = [
  ];
  const jsModuleUrls = ['/parallel-corpus-viewer/parallel-corpus-viewer.js'];
  return [html, cssFiles, jsUrls, jsModuleUrls];
}
