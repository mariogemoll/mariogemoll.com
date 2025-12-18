import {
  createMarkdownRenderer, readMarkdownFile, replaceWidgetPlaceholders
} from '../page-helpers.js';
import { type PageContentParams } from '../types.js';
import { highlightJsCssUrl, tfJsUrl } from './urls.js';


export async function generatePage(
  contentPath: string, pageTitle: string
): Promise<PageContentParams> {
  const md = createMarkdownRenderer({ useHighlightJs: true, useAnchor: true });

  let mdContent = await readMarkdownFile(contentPath, 'diffusion.md', pageTitle);

  const widgets: [string, number, number][] = [
    ['brownian-motion', 480, 420],
    ['sde', 768, 420]
  ];

  mdContent = replaceWidgetPlaceholders(mdContent, widgets);

  const html = md.render(mdContent);

  const cssFiles = [
    highlightJsCssUrl,
    '/misc/centered.css',
    '/misc/widgets.css',
    '/misc/controls.css',
    '/misc/flow-visualizations.css'
  ];

  const jsUrls: string[] = [tfJsUrl];

  const jsModuleUrls = ['/diffusion/diffusion.js'];

  return [html, cssFiles, jsUrls, jsModuleUrls];
}
