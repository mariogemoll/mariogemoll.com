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

  let mdContent = await fsExtra.readFile(
    path.join(contentPath, 'attention-is-all-you-need.md'), 'utf-8');
  const widgetInfo: [string, number, string? ][] = [
    [
      'corpora',
      200,
      'Comparsion of the sizes of the different corpora in the WMT14 dataset. One box represents ' +
      '1000 sentence pairs.'
    ],
    [
      'buckets',
      200,
      'Visualization of the distribution of sentence pairs across different buckets. One box ' +
      'represents 1000 sentence pairs.'
    ]
  ];

  for (const [label, height, description] of widgetInfo) {
    let maybeDescription = '';
    if (description !== undefined) {
      maybeDescription = `<div class="description">${description}</div>`;
    }
    const html = `<div class="widget-container">
          <div id="${label}-widget" class="widget" style="height: ${height.toString()}px">
            <div class="placeholder"
              style="width: 700px; height: ${height.toString()}px; background-color: #eee"></div>
          </div>
          ${maybeDescription}
        </div>`;
    mdContent = mdContent.replace(`[[ ${label}-widget ]]`, html);
  }

  const html = md.render(mdContent);
  const cssFiles: string[] = ['/attention-is-all-you-need/attention-is-all-you-need.css'];
  const jsUrls: string[] = [];
  const jsModuleUrls = ['/attention-is-all-you-need/attention-is-all-you-need.js'];
  return [html, cssFiles, jsUrls, jsModuleUrls];
}
