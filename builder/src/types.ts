// SPDX-FileCopyrightText: 2025 Mario Gemoll
// SPDX-License-Identifier: 0BSD

import { z } from 'zod';

export type ImportMap = Record<string, string>;
export type PageContentParams = [ string, string[], string[], string[], ImportMap? ];

export interface SiteConfig {
  title: string;
  description: string;
  author: string;
  language: string;
}

export const slug = z.string().regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/i, 'kebab-case id');

export const arxivId = z.string().regex(
  /^(\d{4}\.\d{4,5})(v\d+)?$/i,
  'e.g. 1605.08803 or 1605.08803v2'
);

export const youtubeId = z.string().regex(/^[\w-]{11}$/, '11-char YouTube ID');

export const ArxivRef = z.object({
  kind: z.literal('arxiv'),
  id: slug,
  authors: z.array(z.string().min(1)).min(1),
  title: z.string().min(1),
  arxivId: arxivId
}).strict();

export const YoutubeRef = z.object({
  kind: z.literal('youtube'),
  id: slug,
  youtubeId: youtubeId,
  authors: z.array(z.string().min(1)).min(1),
  channel: z.string().min(1),
  title: z.string().min(1),
  year: z.string().regex(/^\d{4}$/, 'four-digit year')
}).strict();

export const Ref = z.discriminatedUnion('kind', [ArxivRef, YoutubeRef]);
export type RefT = z.infer<typeof Ref>;

const stripDiacritics = (s: string): string =>
  s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');

const norm = (s: string): string => stripDiacritics(s).toLocaleLowerCase('en');

/** Extract year from arxivId (e.g., "1410.8516" -> "2014") */
const extractYear = (arxivId: string): string => {
  const yy = arxivId.slice(0, 2);
  const year = parseInt(yy, 10);
  // arXiv started in 1991, so < 91 means 20XX, >= 91 means 19XX
  const fullYear = year < 91 ? 2000 + year : 1900 + year;
  return fullYear.toString();
};

/** Sort key: first author surname, year, title, id. */
export const sortKey = (r: RefT): string => {
  const author = (r.authors[0] ?? '').split(',')[0];  // surname part before comma
  const year = r.kind === 'arxiv' ? extractYear(r.arxivId) : r.year;

  return [
    norm(author),
    year,
    norm(r.title),
    norm(r.id)
  ].join('\u0000'); // safe separator
};

export const compareRefs = (a: RefT, b: RefT): number =>
  sortKey(a).localeCompare(sortKey(b), 'en', { sensitivity: 'base' });

export const RefsArraySorted = z.array(Ref).superRefine((arr, ctx) => {
  // id uniqueness check
  const seen = new Set<string>();
  arr.forEach((r, i) => {
    if (seen.has(r.id)) {
      ctx.addIssue({
        code: 'custom',
        path: [i, 'id'],
        message: `duplicate id "${r.id}"`
      });
    }
    seen.add(r.id);
  });

  // alphabetical order check
  for (let i = 1; i < arr.length; i++) {
    if (compareRefs(arr[i - 1], arr[i]) > 0) {
      const prevTitle = arr[i - 1].title;
      const currTitle = arr[i].title;
      ctx.addIssue({
        code: 'custom',
        path: [i],
        message: 'references must be sorted alphabetically by ' +
          `first author/channel → offending pair: "${prevTitle}" > "${currTitle}"`
      });
      break;
    }
  }
});

export type RefsArraySortedT = z.infer<typeof RefsArraySorted>;

export const PageData = z.object({ references: RefsArraySorted }).strict();
export type PageDataT = z.infer<typeof PageData>;
