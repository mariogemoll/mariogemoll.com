import fsExtra from 'fs-extra';
import hljs from 'highlight.js';
import MarkdownIt from 'markdown-it';
import markdownItAnchor from 'markdown-it-anchor';
import mathjax3 from 'markdown-it-mathjax3';
import path from 'path';

import { PAGE_TITLE_PLACEHOLDER_PATTERN } from '../constants.js';
import { renderReferencesSection, replaceCitations } from '../references.js';
import { type PageContentParams,PageData } from '../types.js';
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

  const jsonContent = await fsExtra.readFile(
    path.join(contentPath, 'flow-matching.json'), 'utf8'
  );
  const pageData = PageData.parse(JSON.parse(jsonContent));

  // Replace citation placeholders before rendering markdown
  mdContent = replaceCitations(mdContent, pageData.references);

  const referencesHtml = renderReferencesSection(pageData.references);

  mdContent = mdContent.replace('[[ references ]]', referencesHtml);
  const widgetLabelsAndDimensions: [string, number, number][] = [
    ['vector-field', 500, 420],
    ['euler-method', 580, 480],
    ['conditional-prob-path', 680, 460],
    ['conditional-prob-path-and-vector-field', 1180, 460],
    ['marginal-prob-path-and-vector-field', 1180, 460],
    ['moons-dataset', 400, 450],
    ['training', 600, 450],
    ['flow-visualization', 400, 450]
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
    '/misc/controls.css',
    '/flow-matching/flow-matching.css'
  ];

  const jsUrls: string[] = [tfJsUrl];

  const jsModuleUrls = ['/flow-matching/flow-matching.js'];

  return [html, cssFiles, jsUrls, jsModuleUrls];
}
