import fsExtra from 'fs-extra';
import hljs from 'highlight.js';
import MarkdownIt from 'markdown-it';
import mathjax3 from 'markdown-it-mathjax3';
import path from 'path';

import { PAGE_TITLE_PLACEHOLDER_PATTERN } from '../constants.js';
import type { PageContentParams } from '../types.js';
import { highlightJsCssUrl, onnxRuntimeWebJsUrl, picaJsUrl } from './urls.js';

export async function generatePage(
  contentPath: string,
  pageTitle: string
): Promise<PageContentParams> {
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
  // Replace placeholder with actual page title
  mdContent = mdContent.replace(PAGE_TITLE_PLACEHOLDER_PATTERN, pageTitle);
  const widgetLabelsAndHeights: [string, number][] = [
    ['datasetexplanation', 300],
    ['datasetvisualization', 300],
    ['sampling', 300],
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
