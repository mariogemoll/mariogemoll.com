import {
  createMarkdownRenderer,
  loadPageData,
  processReferences,
  readMarkdownFile,
  replaceWidgetPlaceholders } from '../page-helpers.js';
import { type PageContentParams } from '../types.js';
import { highlightJsCssUrl, tfJsUrl, tfJsWebGpuBackendUrl } from './urls.js';


export async function generatePage(
  contentPath: string, pageTitle: string
): Promise<PageContentParams> {
  const md = createMarkdownRenderer({ useHighlightJs: true, useAnchor: true });

  let mdContent = await readMarkdownFile(contentPath, 'normalizing-flows.md', pageTitle);

  const pageData = await loadPageData(contentPath, 'normalizing-flows.json');

  mdContent = processReferences(mdContent, pageData);

  const widgets = [
    ['linear-transform', 840, 420],
    ['layers', 800, 320],
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
