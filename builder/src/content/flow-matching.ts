import {
  addVisualizations,
  createMarkdownRenderer,
  loadPageData,
  processReferences,
  readMarkdownFile,
  replaceWidgetPlaceholders,
  type WidgetTuple
} from '../page-helpers.js';
import { type PageContentParams } from '../types.js';
import {
  fileSaverUrl, highlightJsCssUrl, jszipUrl, reactDomUrl, reactUrl, tfJsUrl
} from './urls.js';


export async function generatePage(
  contentPath: string, pageTitle: string
): Promise<PageContentParams> {
  const md = createMarkdownRenderer({ useHighlightJs: true, useAnchor: true });

  let mdContent = await readMarkdownFile(contentPath, 'flow-matching.md', pageTitle);

  const pageData = await loadPageData(contentPath, 'flow-matching.json');

  mdContent = processReferences(mdContent, pageData);

  const visualizations: WidgetTuple[] = [
    ['vector-field', 768, 390],
    ['euler-method', 768, 390],
    ['conditional-probability-path', 768, 420],
    ['conditional-probability-path-ode', 768, 420],
    ['marginal-probability-path-ode', 768, 420]
  ];

  mdContent = addVisualizations(mdContent, visualizations);

  const widgets: WidgetTuple[] = [
    ['moons-dataset', 400, 450],
    ['training', 600, 450],
    ['flow-visualization', 400, 450]
  ];

  mdContent = replaceWidgetPlaceholders(mdContent, widgets);

  const html = md.render(mdContent);

  const cssFiles = [
    highlightJsCssUrl,
    '/misc/centered.css',
    '/misc/widgets.css',
    '/flow-matching/visualization.css',
    '/flow-matching/flow-matching.css'
  ];

  const jsUrls: string[] = [tfJsUrl];

  const jsModuleUrls = ['/flow-matching/flow-matching.js'];

  const importMap: Record<string, string> = {
    'react': reactUrl,
    'react-dom': reactDomUrl,
    'react-dom/client': `${reactDomUrl}/client`,
    'react/jsx-runtime': `${reactUrl}/jsx-runtime`,
    'react/jsx-dev-runtime': `${reactUrl}/jsx-dev-runtime`,
    'file-saver': fileSaverUrl,
    'jszip': jszipUrl
  };

  return [html, cssFiles, jsUrls, jsModuleUrls, importMap];
}
