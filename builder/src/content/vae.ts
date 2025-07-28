import fsExtra from 'fs-extra';
import hljs from 'highlight.js';
import MarkdownIt from 'markdown-it';
import mathjax3 from 'markdown-it-mathjax3';
import path from 'path';

import type { PageContentParams } from '../types.js';

export async function generatePage(contentPath: string): Promise<PageContentParams> {
  const md = new MarkdownIt({
    html: true,
    linkify: true,
    highlight: (str, lang): string => {
      if (lang && hljs.getLanguage(lang)) {
        return `<pre><code class="hljs language-${lang}">` +
          hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
          '</code></pre>';
      }
      return '<pre><code class="hljs">' + md.utils.escapeHtml(str) + '</code></pre>';
    }
  }).use(mathjax3);

  let mdContent = await fsExtra.readFile(path.join(contentPath, 'vae.md'), 'utf-8');
  const widgetLabelsAndHeights: [string, number][] = [
    ['datasetexplanation', 300],
    ['datasetvisualization', 300],
    ['mapping', 300],
    ['evolution', 340],
    ['decoding', 300],
    ['modelcomparison', 340]
  ];

  for (const [label, height] of widgetLabelsAndHeights) {
    const html = `<div id="${label}-widget" class="widget" style="height: ${height.toString()}px">
          <div class="placeholder"
            style="width: 700px; height: ${height.toString()}px; background-color: #eee"></div>
        </div>`;
    mdContent = mdContent.replace(`[[ ${label}-widget ]]`, html);
  }

  const html = md.render(mdContent);
  const cssFiles = [
    'https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/styles/default.min.css',
    '/vae/vae.css'
  ];
  const jsUrls = ['https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort.min.js'];
  const jsModuleUrls = ['/vae/vae.js'];
  return [html, cssFiles, jsUrls, jsModuleUrls];
}
