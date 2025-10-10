import * as cheerio from 'cheerio';
import * as fs from 'fs';
import fsExtra from 'fs-extra';
import MarkdownIt from 'markdown-it';
import mathjax3 from 'markdown-it-mathjax3';
import * as path from 'path';
import pug from 'pug';
import { fileURLToPath,pathToFileURL } from 'url';

import { PAGE_TITLE_PLACEHOLDER_PATTERN } from './constants.js';
import { makeAtomFeed, makeRssFeed, makeSitemap } from './feeds.js';
import type { PageContentParams, SiteConfig } from './types.js';

const markdown = new MarkdownIt({
  html: true,
  linkify: true
}).use(mathjax3);

function randomString(length = 12): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function immediateSubdirs(rootDir: string): string[] {
  return fs.readdirSync(rootDir)
    .filter(name => fs.statSync(path.join(rootDir, name)).isDirectory());
}

function copyAssets(): Map<string, string> {
  // Map: originalId => { randomId, srcFiles }
  const mapping = new Map<string, { randomId: string, srcFiles: string[] }>();

  // Helper to gather files from a root dir
  function gather(dirRoot: string): void {
    for (const dir of immediateSubdirs(dirRoot)) {
      if (!mapping.has(dir)) {
        mapping.set(dir, { randomId: randomString(), srcFiles: [] });
      }
      const obj = mapping.get(dir);
      if (!obj) {
        throw new Error(`Mapping for directory ${dir} not found`);
      }
      const srcDir = path.join(dirRoot, dir);
      for (const filename of fs.readdirSync(srcDir)) {
        const srcFile = path.join(srcDir, filename);
        if (fs.statSync(srcFile).isFile()) {
          obj.srcFiles.push(srcFile);
        }
      }
    }
  }

  gather('../content');
  gather('../frontend/dist');

  // Create all needed directories and copy files
  for (const [, { randomId, srcFiles }] of mapping.entries()) {
    const dstDir = path.join('../build', randomId);
    fs.mkdirSync(dstDir, { recursive: true });
    for (const src of srcFiles) {
      const filename = path.basename(src);
      fsExtra.copySync(src, path.join(dstDir, filename));
    }
  }

  return new Map(
    Array.from(mapping.entries()).map(([id, { randomId }]) => [id, randomId])
  );
}

function makePage(
  pageTemplate: pug.compileTemplate,
  htmlContent: string,
  cssUrls: string[],
  jsUrls: string[],
  jsModuleUrls: string[]
): [string, string] {
  const $ = cheerio.load(htmlContent);
  const h1Tags = $('h1');
  if (h1Tags.length > 1) {
    throw new Error('More than one <h1> found in the content');
  }
  if (h1Tags.length === 0) {
    throw new Error('No <h1> found in the content');
  }
  const title = h1Tags.first().text().trim();
  const output = pageTemplate({ title, content: htmlContent, cssUrls, jsUrls, jsModuleUrls });

  return [output, title];
}

async function makePages(
  contentTemplate: pug.compileTemplate,
  pageTemplate: pug.compileTemplate,
  siteConfig: SiteConfig
): Promise<Map<string, [string, string, string, string, string]>> {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const pageJsPath = path.join(__dirname, 'content');
  const contentPath = path.join(__dirname, '..', '..', 'content');

  const contentTsvPath = path.join(contentPath, 'content.tsv');
  const tsvContent = fs.readFileSync(contentTsvPath, 'utf-8')
    .trim()
    .split('\n');

  // Parse TSV: skip header, extract id, title, description, published, updated
  const pages: {
    id: string;
    title: string;
    description: string;
    published: string;
    updated: string;
  }[] = [];
  for (let i = 1; i < tsvContent.length; i++) {
    const line = tsvContent[i].trim();
    if (line.length > 0) {
      const [id, title, description, published, updated] = line.split('\t');
      pages.push({ id, title, description, published, updated });
    }
  }

  const generatedPages = new Map<string, [string, string, string, string, string]>();
  for (const page of pages) {
    let pageHtmlContent = '';
    let cssUrls: string[] = [];
    let jsUrls: string[] = [];
    let jsModuleUrls: string[] = [];
    const jsPath = path.join(pageJsPath, `${page.id}.js`);
    if (fs.existsSync(jsPath)) {
      const importedModule: unknown = await import(pathToFileURL(jsPath).href);
      if (
        importedModule !== undefined &&
        importedModule !== null &&
        typeof importedModule === 'object' &&
        'generatePage' in importedModule &&
        typeof (importedModule as { generatePage?: unknown }).generatePage === 'function'
      ) {
        const module = importedModule as {
          generatePage: (
            contentPath: string,
            pageTitle: string
          ) => Promise<PageContentParams>
        };
        [pageHtmlContent, cssUrls, jsUrls, jsModuleUrls] =
          await module.generatePage(contentPath, page.title);
      } else {
        throw new Error(`Module for page ${page.id} does not export a generatePage function`);
      }
    } else {
      const mdPath = path.join(contentPath, `${page.id}.md`);
      let mdContent = fs.readFileSync(mdPath, 'utf-8');
      // Replace placeholder with actual page title
      mdContent = mdContent.replace(PAGE_TITLE_PLACEHOLDER_PATTERN, page.title);
      pageHtmlContent = markdown.render(mdContent);
    }
    const secretId = randomString();
    // Add header
    const wrappedHtml = contentTemplate({ content: pageHtmlContent, siteTitle: siteConfig.title });
    const [output] = makePage(pageTemplate, wrappedHtml, cssUrls, jsUrls, jsModuleUrls);
    fs.writeFileSync(`../build/${secretId}.html`, output);
    generatedPages.set(page.id, [
      secretId,
      page.title,
      page.description,
      page.published,
      page.updated
    ]);
  }
  return generatedPages;
}

function makeHomepage(
  homeTemplate: pug.compileTemplate,
  pageTemplate: pug.compileTemplate,
  generatedPages: Map<string, [string, string, string, string, string]>,
  siteConfig: SiteConfig
): string {
  const pages = Array.from(generatedPages.entries())
    .map(([id, [, title]]) => [id, title]);
  const homeHtml = homeTemplate({ pages, siteTitle: siteConfig.title });
  const [output] = makePage(
    pageTemplate, homeHtml, ['/misc/centered.css', '/misc/home.css'], [], []
  );
  const randomId = randomString();
  fs.writeFileSync(`../build/${randomId}.html`, output);
  return randomId;
}

function makeHtaccess(
  generatedPages: Map<string, [string, string, string, string, string]>,
  copiedDirs: Map<string, string>,
  homepageId: string
): void {
  let htaccessContent = `DirectoryIndex ${homepageId}.html\n\n`;
  htaccessContent += 'RewriteEngine On\n';
  htaccessContent += 'RewriteCond %{HTTP_HOST} ^www\\.(.*)$ [NC]\n';
  htaccessContent += 'RewriteRule ^(.*)$ https://%1/$1 [R=301,L]\n';
  for (const [id, [secretId]] of generatedPages.entries()) {
    htaccessContent += `RewriteRule ^${id}$ /${secretId}.html [L]\n`;
  }
  for (const id of generatedPages.keys()) {
    htaccessContent += `RewriteRule ^${id}/$ /${id} [R=301,L]\n`;
  }
  for (const [dir, randomId] of copiedDirs) {
    htaccessContent += `RewriteRule ^${dir}/(.*)$ /${randomId}/$1 [L]\n`;
  }
  fs.writeFileSync('../build/.htaccess', htaccessContent);
}

function writeMappingTSV(copiedDirs: Map<string, string>, dstPath: string): void {
  let tsvContent = '';
  for (const [originalName, randomId] of copiedDirs.entries()) {
    tsvContent += `${originalName}\t${randomId}\n`;
  }

  fs.writeFileSync(dstPath, tsvContent);
}

function validateBaseUrl(url: string | undefined): string {
  if (url === undefined || url === '') {
    throw new Error('BASE_URL environment variable is not set');
  }

  // Check if it's a valid URL
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error(`BASE_URL must use http or https protocol, got: ${parsed.protocol}`);
    }
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(`BASE_URL is not a valid URL: ${url}`);
    }
    throw error;
  }

  // Check for trailing slash
  if (url.endsWith('/')) {
    throw new Error('BASE_URL must not have a trailing slash');
  }

  return url;
}

export async function run(): Promise<void> {
  if (!fs.existsSync('../build')) {
    fs.mkdirSync('../build');
  }
  if (fs.existsSync('../build')) {
    for (const file of fs.readdirSync('../build')) {
      const filePath = path.join('../build', file);
      fsExtra.removeSync(filePath);
    }
  }

  // Load site configuration
  const siteConfigPath = path.join('../content', 'site.json');
  const siteConfig: SiteConfig = JSON.parse(
    fs.readFileSync(siteConfigPath, 'utf-8')
  ) as SiteConfig;

  // Validate and get base URL from environment (required)
  const baseUrl = validateBaseUrl(process.env.BASE_URL);

  const contentTemplate = pug.compileFile('../templates/content.pug');
  const pageTemplate = pug.compileFile('../templates/page.pug');
  const homeTemplate = pug.compileFile('../templates/home.pug');
  const generatedPages = await makePages(contentTemplate, pageTemplate, siteConfig);
  const homepageId = makeHomepage(homeTemplate, pageTemplate, generatedPages, siteConfig);
  const copiedDirs = copyAssets();
  makeHtaccess(generatedPages, copiedDirs, homepageId);
  makeRssFeed(generatedPages, siteConfig, baseUrl);
  makeAtomFeed(generatedPages, siteConfig, baseUrl);
  makeSitemap(generatedPages, baseUrl);

  writeMappingTSV(copiedDirs, '../build_info/directory_mapping.tsv');

  const allIds = new Set([...generatedPages.keys(), ...copiedDirs.keys()]);
  // Order alphabetically
  const sortedIds = Array.from(allIds).sort();

  for (const id of sortedIds) {
    console.log(id);
    const pagesEntry = generatedPages.get(id);
    if (pagesEntry !== undefined) {
      const [secretId, title, description, published, updated] = pagesEntry;
      console.log(`${secretId}.html (${title})`);
      console.log(`Description: ${description}`);
      console.log(`Published: ${published}, Updated: ${updated}`);
    }
    const copiesEntry = copiedDirs.get(id);
    if (copiesEntry !== undefined) {
      console.log(copiesEntry);
    }
    console.log();
  }

  console.log(`Home: ${homepageId}.html`);
  console.log();
  console.log('Site generated successfully!');
}

run().catch((err: unknown) => {
  console.error('Error generating site:', err);
  process.exit(1);
});
