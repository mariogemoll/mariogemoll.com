import fsExtra from 'fs-extra';
import hljs from 'highlight.js';
import MarkdownIt from 'markdown-it';
import markdownItAnchor from 'markdown-it-anchor';
import mathjax3 from 'markdown-it-mathjax3';
import path from 'path';

import { PAGE_TITLE_PLACEHOLDER_PATTERN } from '../constants.js';
import { renderReferencesSection, replaceCitations } from '../references.js';
import { type PageContentParams,PageData } from '../types.js';
import { highlightJsCssUrl, tfJsUrl, tfJsWebGpuBackendUrl } from './urls.js';


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

  let mdContent = await fsExtra.readFile(path.join(contentPath, 'normalizing-flows.md'), 'utf-8');
  mdContent = mdContent.replace(PAGE_TITLE_PLACEHOLDER_PATTERN, pageTitle);

  const jsonContent = await fsExtra.readFile(
    path.join(contentPath, 'normalizing-flows.json'), 'utf8'
  );
  const pageData = PageData.parse(JSON.parse(jsonContent));

  // Replace citation placeholders before rendering markdown
  mdContent = replaceCitations(mdContent, pageData.references);

  const referencesHtml = renderReferencesSection(pageData.references);
  mdContent = mdContent.replace('[[ references ]]', referencesHtml);

  const widgetLabelsAndHeights: [string, number, number][] = [
    ['linear-transform', 840, 420],
    ['layers', 800, 320],
    ['moons-dataset', 400, 450],
    ['training', 600, 450],
    ['flow-visualization', 400, 450]
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
    highlightJsCssUrl,
    '/misc/centered.css',
    '/misc/widgets.css',
    '/normalizing-flows/normalizing-flows.css',
    '/normalizing-flows/linear-transform-widget.css'
  ];

  const jsUrls: string[] = [
    tfJsUrl,
    tfJsWebGpuBackendUrl
  ];

  const jsModuleUrls = ['/normalizing-flows/normalizing-flows.js'];

  return [html, cssFiles, jsUrls, jsModuleUrls];
}
