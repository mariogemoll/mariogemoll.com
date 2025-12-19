import {
  createMarkdownRenderer,
  loadPageData,
  processReferences,
  readMarkdownFile,
  replaceWidgetPlaceholders
} from '../page-helpers.js';
import { type PageContentParams } from '../types.js';
import { highlightJsCssUrl, tfJsUrl } from './urls.js';


export async function generatePage(
  contentPath: string, pageTitle: string
): Promise<PageContentParams> {
  const md = createMarkdownRenderer({ useHighlightJs: true, useAnchor: true });

  let mdContent = await readMarkdownFile(contentPath, 'diffusion.md', pageTitle);

  const pageData = await loadPageData(contentPath, 'diffusion.json');

  mdContent = processReferences(mdContent, pageData);

  const widgets: [string, number, number][] = [
    ['brownian-motion', 480, 420],
    ['sde', 768, 420],
    ['conditional-path-ode-sde', 1440, 520],
    ['marginal-path-ode-sde', 1440, 520],
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
    '/misc/controls.css',
    '/misc/flow-visualizations.css',
    '/diffusion/diffusion.css'
  ];

  const jsUrls: string[] = [tfJsUrl];

  const jsModuleUrls = ['/diffusion/diffusion.js'];

  return [html, cssFiles, jsUrls, jsModuleUrls];
}
