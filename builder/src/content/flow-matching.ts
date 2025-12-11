import {
  createMarkdownRenderer,
  loadPageData,
  processReferences,
  readMarkdownFile,
  replaceWidgetPlaceholders } from '../page-helpers.js';
import { type PageContentParams } from '../types.js';
import { highlightJsCssUrl, tfJsUrl } from './urls.js';


export async function generatePage(
  contentPath: string, pageTitle: string
): Promise<PageContentParams> {
  const md = createMarkdownRenderer({ useHighlightJs: true, useAnchor: true });

  let mdContent = await readMarkdownFile(contentPath, 'flow-matching.md', pageTitle);

  const pageData = await loadPageData(contentPath, 'flow-matching.json');

  mdContent = processReferences(mdContent, pageData);

  const widgets = [
    ['vector-field', 500, 420],
    ['euler-method', 580, 480],
    ['conditional-prob-path', 680, 460],
    ['conditional-prob-path-and-vector-field', 1180, 460],
    ['marginal-prob-path-and-vector-field', 1180, 460],
    ['moons-dataset', 400, 450],
    ['training', 600, 450],
    ['flow-visualization', 400, 450]
  ] as const;

  mdContent = replaceWidgetPlaceholders(mdContent, widgets);

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
