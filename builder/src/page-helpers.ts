import fsExtra from 'fs-extra';
import hljs from 'highlight.js';
import MarkdownIt from 'markdown-it';
import markdownItAnchor from 'markdown-it-anchor';
import mathjax3 from 'markdown-it-mathjax3';
import path from 'path';

import { PAGE_TITLE_PLACEHOLDER_PATTERN } from './constants.js';
import { renderReferencesSection, replaceCitations } from './references.js';
import { PageData, type PageDataT } from './types.js';

export interface MarkdownRendererOptions {
  useHighlightJs?: boolean;
  useAnchor?: boolean;
}

export function createMarkdownRenderer(options: MarkdownRendererOptions = {}): MarkdownIt {
  const { useHighlightJs = false, useAnchor = false } = options;

  const mdConfig: MarkdownIt.Options = {
    html: true,
    linkify: true
  };

  if (useHighlightJs) {
    mdConfig.highlight = (str, lang): string => {
      if (lang && hljs.getLanguage(lang)) {
        return `<pre><code class="hljs language-${lang}">` +
          hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
          '</code></pre>';
      }
      const md = new MarkdownIt();
      return '<pre><code class="hljs">' + md.utils.escapeHtml(str) + '</code></pre>';
    };
  }

  let md = new MarkdownIt(mdConfig);

  if (useAnchor) {
    md = md.use(markdownItAnchor);
  }

  md = md.use(mathjax3);

  return md;
}

export async function readMarkdownFile(
  contentPath: string,
  filename: string,
  pageTitle: string
): Promise<string> {
  let mdContent = await fsExtra.readFile(path.join(contentPath, filename), 'utf-8');

  const matches = mdContent.match(new RegExp(PAGE_TITLE_PLACEHOLDER_PATTERN, 'g'));

  if (matches === null || matches.length === 0) {
    throw new Error(`Page title placeholder not found in ${filename}`);
  }

  if (matches.length > 1) {
    throw new Error(
      `Page title placeholder appears ${matches.length} times in ${filename}, expected exactly 1`
    );
  }

  mdContent = mdContent.replace(PAGE_TITLE_PLACEHOLDER_PATTERN, pageTitle);

  return mdContent;
}

type WidgetTuple = readonly [string, number, number] | readonly [string, number, number, string];

export function replaceWidgetPlaceholders(
  mdContent: string,
  widgets: readonly WidgetTuple[]
): string {
  let result = mdContent;

  for (const widget of widgets) {
    const [label, width, height, description] = widget;

    const placeholder = `[[ ${label}-widget ]]`;

    if (!result.includes(placeholder)) {
      throw new Error(`Widget placeholder "${placeholder}" not found in content`);
    }

    const styleStr = `width: ${width}px; height: ${height}px;`;

    let html = `<div id="${label}-widget" class="widget ${label}-widget" style="${styleStr}">
      <div class="placeholder" style="${styleStr}"></div>
    </div>`;

    if (description !== undefined) {
      html = `<div class="widget-container">
        ${html}<div class="description">${description}</div></div>`;
    }

    result = result.replace(placeholder, html);
  }

  return result;
}

export async function loadPageData(contentPath: string, filename: string): Promise<PageDataT> {
  const jsonContent = await fsExtra.readFile(path.join(contentPath, filename), 'utf8');
  return PageData.parse(JSON.parse(jsonContent));
}

export function processReferences(mdContent: string, pageData: PageDataT): string {
  let result = replaceCitations(mdContent, pageData.references);
  const referencesHtml = renderReferencesSection(pageData.references);
  result = result.replace('[[ references ]]', referencesHtml);
  return result;
}
