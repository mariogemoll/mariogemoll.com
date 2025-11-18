import fsExtra from 'fs-extra';
import hljs from 'highlight.js';
import MarkdownIt from 'markdown-it';
import markdownItAnchor from 'markdown-it-anchor';
import mathjax3 from 'markdown-it-mathjax3';
import path from 'path';

import { PAGE_TITLE_PLACEHOLDER_PATTERN } from '../constants.js';
import { type PageContentParams } from '../types.js';
import { highlightJsCssUrl, tfJsUrl } from './urls.js';


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
  })
    .use(markdownItAnchor)
    .use(mathjax3);

  let mdContent = await fsExtra.readFile(path.join(contentPath, 'flow-matching.md'), 'utf-8');
  mdContent = mdContent.replace(PAGE_TITLE_PLACEHOLDER_PATTERN, pageTitle);

  const widgetLabelsAndDimensions: [string, number, number][] = [
    ['conditional-prob-path', 480, 460],
    ['conditional-prob-path-and-vector-field', 960, 460],
    ['marginal-prob-path-and-vector-field', 1200, 460]
  ];

  for (const [label, width, height] of widgetLabelsAndDimensions) {
    const styleStr = `width: ${width.toString()}px; height: ${height.toString()}px;`;
    const html = `<div id="${label}-widget" class="widget ${label}-widget" style="${styleStr}">
      <div class="placeholder" style="${styleStr}"></div>
    </div>`;
    mdContent = mdContent.replace(`[[ ${label}-widget ]]`, html);
  }

  const html = md.render(mdContent);

  const cssFiles = [
    highlightJsCssUrl,
    '/misc/centered.css',
    '/misc/widgets.css',
    '/flow-matching/flow-matching.css'
  ];

  const jsUrls: string[] = [tfJsUrl];

  const jsModuleUrls = ['/flow-matching/flow-matching.js'];

  return [html, cssFiles, jsUrls, jsModuleUrls];
}
