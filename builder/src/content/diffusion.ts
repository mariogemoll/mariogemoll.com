import {
  addVisualizations,
  createMarkdownRenderer,
  loadPageData,
  processReferences,
  readMarkdownFile,
  replaceWidgetPlaceholders,
  type WidgetTuple } from '../page-helpers.js';
import { type PageContentParams } from '../types.js';
import { highlightJsCssUrl, reactDomUrl, reactUrl, tfJsUrl } from './urls.js';


export async function generatePage(
  contentPath: string, pageTitle: string
): Promise<PageContentParams> {
  const md = createMarkdownRenderer({ useHighlightJs: true, useAnchor: true });

  let mdContent = await readMarkdownFile(contentPath, 'diffusion.md', pageTitle);

  const pageData = await loadPageData(contentPath, 'diffusion.json');

  mdContent = processReferences(mdContent, pageData);

  const visualizations: WidgetTuple[] = [
    ['brownian-motion', 480, 420],
    ['euler-maruyama-method', 480, 420],
    ['conditional-probability-path-ode-sde', 768, 420],
    ['marginal-probability-path-ode-sde', 768, 420]
  ];

  mdContent = addVisualizations(mdContent, visualizations);

  const widgets: WidgetTuple[] = [
    ['moons-dataset', 400, 450],
    ['flow-matching-training', 600, 450],
    ['score-matching-training', 600, 450],
    ['diffusion-visualization', 400, 450]
  ];

  mdContent = replaceWidgetPlaceholders(mdContent, widgets);

  const html = md.render(mdContent);

  const cssFiles = [
    highlightJsCssUrl,
    '/misc/centered.css',
    '/misc/widgets.css',
    '/flow-matching/visualization.css',
    '/diffusion/diffusion.css'
  ];

  const jsUrls: string[] = [tfJsUrl];

  const jsModuleUrls = ['/diffusion/diffusion.js'];

  const importMap: Record<string, string> = {
    'react': reactUrl,
    'react-dom': reactDomUrl,
    'react-dom/client': `${reactDomUrl}/client`,
    'react/jsx-runtime': `${reactUrl}/jsx-runtime`,
    'react/jsx-dev-runtime': `${reactUrl}/jsx-dev-runtime`
  };

  return [html, cssFiles, jsUrls, jsModuleUrls, importMap];
}
