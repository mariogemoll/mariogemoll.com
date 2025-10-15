import fsExtra from 'fs-extra';
import hljs from 'highlight.js';
import MarkdownIt from 'markdown-it';
import mathjax3 from 'markdown-it-mathjax3';
import path from 'path';

import { PAGE_TITLE_PLACEHOLDER_PATTERN } from '../constants.js';
import type { PageContentParams } from '../types.js';

export async function generatePage(
  contentPath: string, pageTitle: string
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

  let mdContent = await fsExtra.readFile(path.join(contentPath, 'normalizing-flows.md'), 'utf-8');
  mdContent = mdContent.replace(PAGE_TITLE_PLACEHOLDER_PATTERN, pageTitle);
  const widgetLabelsAndHeights: [string, number, number][] = [
    ['linear-transform', 1200, 300]
  ];

  for (const [label, width, height] of widgetLabelsAndHeights) {
    const styleStr = `width: ${width.toString()}px; height: ${height.toString()}px;`;
    const html = `<div id="${label}-widget" class="widget ${label}-widget" style="${styleStr}">
      <div class="placeholder" style="${styleStr}"></div>
    </div>`;
    mdContent = mdContent.replace(`[[ ${label}-widget ]]`, html);
  }

  const html = md.render(mdContent);

  const cssFiles = [
    'https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/styles/default.min.css',
    '/misc/centered.css',
    '/misc/widgets.css',
    '/normalizing-flows/normalizing-flows.css',
    '/normalizing-flows/linear-transform-widget.css'
  ];

  const jsUrls: string[] = [
  ];

  const jsModuleUrls = ['/normalizing-flows/normalizing-flows.js'];

  return [html, cssFiles, jsUrls, jsModuleUrls];
}
