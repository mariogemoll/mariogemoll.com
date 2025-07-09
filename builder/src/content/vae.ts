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

  let mdContent = await fsExtra.readFile(path.join(contentPath, 'vae.md'), 'utf-8');

  for (const label of ['datasetexplanation', 'mapping', 'decoding']) {
    const widgetPath = path.join(contentPath, `../vae/widgets/html/${label}.html`);
    const html = await fsExtra.readFile(widgetPath, 'utf-8');
    mdContent = mdContent.replace(`[[ ${label}-widget ]]`, html);
  }

  const html = md.render(mdContent);
  const cssFiles = ['/vae/vae.css'];
  const jsUrls = ['https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort.min.js'];
  const jsModuleUrls = ['/vae/vae.js'];
  return [html, cssFiles, jsUrls, jsModuleUrls];
}
