import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

import * as cheerio from 'cheerio';
import fsExtra from 'fs-extra';
import MarkdownIt from 'markdown-it';
import mathjax3 from 'markdown-it-mathjax3';
import pug from 'pug';

import type { PageContentParams } from './types.js';

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

function copyAssets(): [string, string][] {
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

  // Return mapping as [originalId, randomId][]
  return Array.from(mapping.entries()).map(([id, { randomId }]) => [id, randomId]);
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

async function makePages(pageTemplate: pug.compileTemplate): Promise<[string, string, string][]> {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const pageJsPath = path.join(__dirname, 'content');
  const contentPath = path.join(__dirname, '..', '..', 'content');

  const pages = fs.readdirSync('../content')
    .filter(f => f.endsWith('.md'))
    .map(f => f.slice(0, -3));
  const generatedPages: [string, string, string][] = [];
  let pageHtmlContent = '';
  let cssUrls: string[] = [];
  let jsUrls: string[] = [];
  let jsModuleUrls: string[] = [];
  for (const id of pages) {
    const jsPath = path.join(pageJsPath, `${id}.js`);
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
          generatePage: (contentPath: string) => Promise<PageContentParams>
        };
        [pageHtmlContent, cssUrls, jsUrls, jsModuleUrls] = await module.generatePage(contentPath);
      } else {
        throw new Error(`Module for page ${id} does not export a generatePage function`);
      }
    } else {
      const mdPath = path.join(contentPath, `${id}.md`);
      const mdContent = fs.readFileSync(mdPath, 'utf-8');
      pageHtmlContent = markdown.render(mdContent);
    }
    const secretId = randomString();
    const [output, title] = makePage(pageTemplate, pageHtmlContent, cssUrls, jsUrls, jsModuleUrls);
    fs.writeFileSync(`../build/${secretId}.html`, output);
    generatedPages.push([id, secretId, title]);
  }
  return generatedPages;
}

function makeHomepage(
  homeTemplate: pug.compileTemplate,
  pageTemplate: pug.compileTemplate,
  generatedPages: [string, string, string][]
): string {
  const pages = generatedPages.map(([id, , title]) => [id, title] as [string, string]);
  const homeHtml = homeTemplate({ pages });
  const [output] = makePage(pageTemplate, homeHtml, [], [], []);
  const randomId = randomString();
  fs.writeFileSync(`../build/${randomId}.html`, output);
  return randomId;
}

function makeHtaccess(
  generatedPages: [string, string, string][],
  copiedDirs: [string, string][],
  homepageId: string
): void {
  let htaccessContent = `DirectoryIndex ${homepageId}.html\n\n`;
  htaccessContent += 'RewriteEngine On\n';
  for (const [id, secretId] of generatedPages.map(([id, secretId]) => [id, secretId])) {
    htaccessContent += `RewriteRule ^${id}$ /${secretId}.html [L]\n`;
  }
  for (const [id] of generatedPages.map(([id]) => [id])) {
    htaccessContent += `RewriteRule ^${id}/$ /${id} [R=301,L]\n`;
  }
  for (const [dir, randomId] of copiedDirs) {
    htaccessContent += `RewriteRule ^${dir}/(.*)$ /${randomId}/$1 [L]\n`;
  }
  fs.writeFileSync('../build/.htaccess', htaccessContent);
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
  const pageTemplate = pug.compileFile('../templates/page.pug');
  const homeTemplate = pug.compileFile('../templates/home.pug');
  const generatedPages = await makePages(pageTemplate);
  const homepageId = makeHomepage(homeTemplate, pageTemplate, generatedPages);
  const copiedDirs = copyAssets();
  makeHtaccess(generatedPages, copiedDirs, homepageId);
  console.log('Site generated successfully!');
}

run().catch((err: unknown) => {
  console.error('Error generating site:', err);
  process.exit(1);
});
