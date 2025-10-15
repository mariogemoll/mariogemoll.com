import * as fs from 'fs';
import { create } from 'xmlbuilder2';

import type { SiteConfig } from './types.js';

function normalizeUrl(base: string, path: string): string {
  const baseWithoutTrailing = base.endsWith('/') ? base.slice(0, -1) : base;
  const pathWithLeading = path.startsWith('/') ? path : `/${path}`;
  return baseWithoutTrailing + pathWithLeading;
}

export function makeSitemap(
  generatedPages: Map<string, [string, string, string, string, string]>,
  baseUrl: string
): void {
  const root = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('urlset', { xmlns: 'http://www.sitemaps.org/schemas/sitemap/0.9' });

  // Add homepage
  root
    .ele('url')
    .ele('loc').txt(`${baseUrl}/`).up()
    .ele('changefreq').txt('weekly').up()
    .ele('priority').txt('1.0').up()
    .up();

  // Add all pages
  for (const [id, [, , , , updated]] of generatedPages.entries()) {
    const url = normalizeUrl(baseUrl, id);
    const lastmod = new Date(updated).toISOString().split('T')[0]; // YYYY-MM-DD format

    root
      .ele('url')
      .ele('loc').txt(url).up()
      .ele('lastmod').txt(lastmod).up()
      .ele('changefreq').txt('monthly').up()
      .ele('priority').txt('0.8').up()
      .up();
  }

  const xml = root.end({ prettyPrint: true });
  fs.writeFileSync('../build/sitemap.xml', xml);
}

export function makeRssFeed(
  generatedPages: Map<string, [string, string, string, string, string]>,
  siteConfig: SiteConfig,
  baseUrl: string
): void {
  const buildDate = new Date().toUTCString();

  // Sort pages by published date (newest first)
  const sortedPages = Array.from(generatedPages.entries())
    .sort(([, [, , , publishedA]], [, [, , , publishedB]]) => {
      return new Date(publishedB).getTime() - new Date(publishedA).getTime();
    });

  const root = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('rss', { version: '2.0', 'xmlns:atom': 'http://www.w3.org/2005/Atom' })
    .ele('channel')
    .ele('title').txt(siteConfig.title).up()
    .ele('link').txt(`${baseUrl}/`).up()
    .ele('description').txt(siteConfig.description).up()
    .ele('language').txt(siteConfig.language).up()
    .ele('lastBuildDate').txt(buildDate).up()
    .ele('atom:link', {
      href: normalizeUrl(baseUrl, 'rss.xml'),
      rel: 'self',
      type: 'application/rss+xml'
    }).up();

  for (const [id, [, title, description, published]] of sortedPages) {
    const url = normalizeUrl(baseUrl, id);
    const pubDate = new Date(published).toUTCString();

    root
      .ele('item')
      .ele('title').txt(title).up()
      .ele('link').txt(url).up()
      .ele('guid').txt(url).up()
      .ele('description').txt(description).up()
      .ele('pubDate').txt(pubDate).up()
      .up();
  }

  const xml = root.end({ prettyPrint: true });
  fs.writeFileSync('../build/rss.xml', xml);
}

export function makeAtomFeed(
  generatedPages: Map<string, [string, string, string, string, string]>,
  siteConfig: SiteConfig,
  baseUrl: string
): void {
  const buildDate = new Date().toISOString();

  // Sort pages by published date (newest first)
  const sortedPages = Array.from(generatedPages.entries())
    .sort(([, [, , , publishedA]], [, [, , , publishedB]]) => {
      return new Date(publishedB).getTime() - new Date(publishedA).getTime();
    });

  const root = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('feed', { xmlns: 'http://www.w3.org/2005/Atom' })
    .ele('title').txt(siteConfig.title).up()
    .ele('link', { href: `${baseUrl}/` }).up()
    .ele('link', { href: normalizeUrl(baseUrl, 'atom.xml'), rel: 'self' }).up()
    .ele('updated').txt(buildDate).up()
    .ele('id').txt(`${baseUrl}/`).up()
    .ele('author')
    .ele('name').txt(siteConfig.author).up()
    .up();

  for (const [id, [, title, description, published, updated]] of sortedPages) {
    const url = normalizeUrl(baseUrl, id);
    const publishedIso = new Date(published).toISOString();
    const updatedIso = new Date(updated).toISOString();

    root
      .ele('entry')
      .ele('title').txt(title).up()
      .ele('link', { href: url }).up()
      .ele('id').txt(url).up()
      .ele('published').txt(publishedIso).up()
      .ele('updated').txt(updatedIso).up()
      .ele('summary').txt(description).up()
      .up();
  }

  const xml = root.end({ prettyPrint: true });
  fs.writeFileSync('../build/atom.xml', xml);
}
