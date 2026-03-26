// SPDX-FileCopyrightText: 2025 Mario Gemoll
// SPDX-License-Identifier: 0BSD

import fsExtra from 'fs-extra';
import hljs from 'highlight.js';
import MarkdownIt from 'markdown-it';
import type StateBlock from 'markdown-it/lib/rules_block/state_block.mjs';
import type StateInline from 'markdown-it/lib/rules_inline/state_inline.mjs';
import markdownItAnchor from 'markdown-it-anchor';
import path from 'path';

import { PAGE_TITLE_PLACEHOLDER_PATTERN } from './constants.js';
import { renderReferencesSection, replaceCitations } from './references.js';
import { PageData, type PageDataT } from './types.js';

function isValidDelim(
  state: StateInline, pos: number
): { can_open: boolean; can_close: boolean } {
  const max = state.posMax;
  let can_open = true;
  let can_close = true;
  const prevChar = pos > 0 ? state.src.charCodeAt(pos - 1) : -1;
  const nextChar = pos + 1 <= max ? state.src.charCodeAt(pos + 1) : -1;
  if (prevChar === 0x20 || prevChar === 0x09 ||
      (nextChar >= 0x30 && nextChar <= 0x39)) {
    can_close = false;
  }
  if (nextChar === 0x20 || nextChar === 0x09) {
    can_open = false;
  }
  return { can_open, can_close };
}

function mathInlineRule(state: StateInline, silent: boolean): boolean {
  if (state.src[state.pos] !== '$') {return false;}
  let res = isValidDelim(state, state.pos);
  if (!res.can_open) {
    if (!silent) {state.pending += '$';}
    state.pos += 1;
    return true;
  }
  const start = state.pos + 1;
  let match = start;
  while ((match = state.src.indexOf('$', match)) !== -1) {
    let pos = match - 1;
    while (state.src[pos] === '\\') {pos -= 1;}
    if ((match - pos) % 2 === 1) {break;}
    match += 1;
  }
  if (match === -1) {
    if (!silent) {state.pending += '$';}
    state.pos = start;
    return true;
  }
  if (match - start === 0) {
    if (!silent) {state.pending += '$$';}
    state.pos = start + 1;
    return true;
  }
  res = isValidDelim(state, match);
  if (!res.can_close) {
    if (!silent) {state.pending += '$';}
    state.pos = start;
    return true;
  }
  if (!silent) {
    const token = state.push('math_inline', 'math', 0);
    token.markup = '$';
    token.content = state.src.slice(start, match);
  }
  state.pos = match + 1;
  return true;
}

function mathBlockRule(
  state: StateBlock, start: number, end: number, silent: boolean
): boolean {
  let pos = state.bMarks[start] + state.tShift[start];
  let max = state.eMarks[start];
  if (pos + 2 > max) {return false;}
  if (state.src.slice(pos, pos + 2) !== '$$') {return false;}
  pos += 2;
  let firstLine = state.src.slice(pos, max);
  if (silent) {return true;}
  let found = false;
  let lastLine = '';
  if (firstLine.trim().endsWith('$$')) {
    firstLine = firstLine.trim().slice(0, -2);
    found = true;
  }
  let next = start;
  for (; !found;) {
    next++;
    if (next >= end) {break;}
    pos = state.bMarks[next] + state.tShift[next];
    max = state.eMarks[next];
    if (pos < max && state.tShift[next] < state.blkIndent) {break;}
    if (state.src.slice(pos, max).trim().endsWith('$$')) {
      const lastPos = state.src.slice(0, max).lastIndexOf('$$');
      lastLine = state.src.slice(pos, lastPos);
      found = true;
    }
  }
  state.line = next + 1;
  const token = state.push('math_block', 'math', 0);
  token.block = true;
  token.content =
    (firstLine.trim() ? firstLine + '\n' : '') +
    state.getLines(start + 1, next, state.tShift[start], true) +
    (lastLine.trim() ? lastLine : '');
  token.map = [start, state.line];
  token.markup = '$$';
  return true;
}

function mathPassthrough(md: MarkdownIt): void {
  md.inline.ruler.after('escape', 'math_inline', mathInlineRule);
  md.block.ruler.after('blockquote', 'math_block', mathBlockRule, {
    alt: ['paragraph', 'reference', 'blockquote', 'list']
  });
  md.renderer.rules.math_inline = (tokens, idx): string =>
    `\\(${tokens[idx].content}\\)`;
  md.renderer.rules.math_block = (tokens, idx): string =>
    `\\[${tokens[idx].content}\\]`;
}

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

  md.use(mathPassthrough);

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

export type WidgetTuple = readonly [string, number, number, string?];

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

export function addVisualizations(
  mdContent: string,
  visualizations: readonly WidgetTuple[]
): string {
  let result = mdContent;
  for (const [label, width, height, description] of visualizations) {
    const placeholder = `[[ ${label}-visualization ]]`;

    if (!result.includes(placeholder)) {
      throw new Error(`Visualization placeholder "${placeholder}" not found in content`);
    }

    const styleStr = `width: ${width}px; height: ${height}px;`;

    let containerContent = `<div class="placeholder" style="${styleStr}"></div>`;

    if (description !== undefined) {
      containerContent += `<div class="description">${description}</div>`;
    }

    const html = `<div id="${label}-visualization" class="visualization-container">
      ${containerContent}
    </div>`;

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
