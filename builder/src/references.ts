// SPDX-FileCopyrightText: 2025 Mario Gemoll
// SPDX-License-Identifier: 0BSD

import type { RefsArraySortedT } from './types';

const arxivUrl = (id: string): string => `https://arxiv.org/abs/${id}`;

const ytUrl = (id: string): string => `https://www.youtube.com/watch?v=${id}`;

/** Extract year from arxivId (e.g., "1410.8516" -> "2014") */
const extractYear = (arxivId: string): string => {
  const yy = arxivId.slice(0, 2);
  const year = parseInt(yy, 10);
  // arXiv started in 1991, so < 91 means 20XX, >= 91 means 19XX
  const fullYear = year < 91 ? 2000 + year : 1900 + year;
  return fullYear.toString();
};

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const formatAuthors = (a: string[]): string => {
  if (a.length === 0) {return '';}
  if (a.length === 1) {return a[0];}
  if (a.length === 2) {return a.join(' & ');}
  return a.slice(0, -1).join(', ') + ' & ' + a[a.length - 1];
};

/** Format citation for inline use: "Surname et al., 2020" or "Surname, 2020" */
const formatCitation = (authors: string[], year: string): string => {
  if (authors.length === 0) {return '';}
  const firstAuthor = authors[0].split(',')[0]; // Get surname only
  if (authors.length === 1) {
    return `${firstAuthor}, ${year}`;
  }
  if (authors.length === 2) {
    const secondAuthor = authors[1].split(',')[0]; // Get surname only
    return `${firstAuthor} & ${secondAuthor}, ${year}`;
  }
  return `${firstAuthor} et al., ${year}`;
};

export function renderReferencesSection(refs: RefsArraySortedT): string {

  if (refs.length === 0) {return '';}

  const itemsHtml = refs.map(r =>
    r.kind === 'arxiv'
      ? `<li id="ref-${esc(r.id)}">` +
        `<strong>${esc(formatAuthors(r.authors))} (${extractYear(r.arxivId)})</strong><br>` +
        `<em>${esc(r.title)}</em><br>` +
        `<a href="${arxivUrl(r.arxivId)}" target="_blank" rel="noopener">` +
        `arXiv:${esc(r.arxivId)}</a></li>`
      : `<li id="ref-${esc(r.id)}">` +
        `<strong>${esc(formatAuthors(r.authors))} (${esc(r.year)})</strong><br>` +
        `<em>${esc(r.title)}</em><br>` +
        `<a href="${ytUrl(r.youtubeId)}" target="_blank" rel="noopener">` +
        `YouTube video</a> (channel: ${esc(r.channel)})</li>`
  ).join('\n');

  return '<h2 id="references">References</h2>' +
    `<ul class="references-list">\n${itemsHtml}\n</ul>`;
}

/**
 * Replace [[ ref-id ]] or [[ ref-id (custom text) ]] placeholders with formatted citations.
 * Examples:
 *   [[ ref-dinh-et-al-2014 ]] → <a href="...">Dinh et al., 2014</a>
 *   [[ ref-dinh-et-al-2014 (NICE paper) ]] → <a href="...">NICE paper</a>
 */
export function replaceCitations(content: string, refs: RefsArraySortedT): string {
  const refMap = new Map(refs.map(r => [r.id, r]));

  return content.replace(
    /\[\[\s*ref-([a-z]+(?:-[a-z]+)*-\d{4})(?:\s+\(([^)]+)\))?\s*\]\]/gi,
    (_match, ...args) => {
      const id = args[0] as string;
      const customText = args[1] as string | undefined;
      const ref = refMap.get(id);
      if (!ref) {
        throw new Error(`Reference "${id}" not found in references list`);
      }

      const year = ref.kind === 'arxiv' ? extractYear(ref.arxivId) : ref.year;
      const citation = customText ?? formatCitation(ref.authors, year);
      const url = ref.kind === 'arxiv' ? arxivUrl(ref.arxivId) : ytUrl(ref.youtubeId);
      return `<a href="${url}">${esc(citation)}</a>`;
    }
  );
}
