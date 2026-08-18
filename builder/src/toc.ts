// SPDX-FileCopyrightText: 2026 Mario Gemoll
// SPDX-License-Identifier: 0BSD

import * as cheerio from 'cheerio';

export interface TocEntry {
  id: string;
  level: 2 | 3;
  text: string;
}

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Collect the section headings of a rendered page.
 *
 * Reads the finished HTML rather than the markdown token stream so that headings written as raw
 * HTML (the references section, and a couple of hand-written ones in the content) are picked up
 * too. Only headings that carry an id can be linked to, and requiring one conveniently skips the
 * headings that belong to visualizations.
 */
export function extractHeadings(html: string): TocEntry[] {
  const $ = cheerio.load(html);
  return $('h2[id], h3[id]').toArray().map(el => {
    const id = $(el).attr('id');
    if (id === undefined) {
      throw new Error('Heading matched [id] selector but has no id');
    }
    return {
      id,
      level: el.tagName.toLowerCase() === 'h2' ? 2 : 3,
      text: $(el).text().trim()
    };
  });
}

/**
 * One row per heading. Collapsed, the label is hidden and the row's left border is all that shows,
 * which keeps every row in exactly the same place in both states.
 */
function renderLinks(entries: TocEntry[]): string {
  const items = entries.map(
    entry => `<li class="toc-item toc-item-h${entry.level}">` +
      `<a class="toc-link" href="#${esc(entry.id)}">` +
      `<span class="toc-label">${esc(entry.text)}</span></a></li>`
  ).join('');
  return `<ul class="toc-list">${items}</ul>`;
}

const hamburgerIcon =
  '<svg class="toc-icon-open" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
  '<line x1="3" y1="6" x2="21" y2="6"></line>' +
  '<line x1="3" y1="12" x2="21" y2="12"></line>' +
  '<line x1="3" y1="18" x2="21" y2="18"></line></svg>';

const closeIcon =
  '<svg class="toc-icon-close" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
  '<line x1="5" y1="5" x2="19" y2="19"></line>' +
  '<line x1="19" y1="5" x2="5" y2="19"></line></svg>';

/* Points left after the title while the panel is open: collapse it. Flipped by the CSS to point
   right once collapsed: open it again. */
const chevronsIcon =
  '<svg class="toc-chevrons" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
  '<polyline points="13 6 7 12 13 18"></polyline>' +
  '<polyline points="19 6 13 12 19 18"></polyline></svg>';

/** Render the table of contents. Returns an empty string if there is nothing worth listing. */
export function renderToc(entries: TocEntry[]): string {
  if (entries.length < 2) {
    return '';
  }
  return '<nav class="toc" aria-label="Contents">' +
    '<button class="toc-toggle" type="button" aria-expanded="false" aria-controls="toc-panel" ' +
    `aria-label="Contents">${hamburgerIcon}${closeIcon}</button>` +
    '<div class="toc-panel" id="toc-panel">' +
    '<div class="toc-header">' +
    '<button class="toc-collapse" type="button" aria-expanded="true" aria-controls="toc-panel" ' +
    `aria-label="Collapse contents">${chevronsIcon}</button>` +
    '<span class="toc-title">Contents</span></div>' +
    renderLinks(entries) +
    '</div></nav>';
}

/** Prepend a table of contents to a rendered page. */
export function addToc(html: string): string {
  return renderToc(extractHeadings(html)) + html;
}
