import * as fs from 'fs';
import * as path from 'path';

import * as cheerio from 'cheerio';
import fsExtra from 'fs-extra';
import MarkdownIt from 'markdown-it';
import mathjax3 from 'markdown-it-mathjax3';
import pug from 'pug';

const markdown = new MarkdownIt({
  html: true,
  linkify: true
}).use(mathjax3);

/**
 * Generate a random string of specified length
 */
function randomString(length = 12): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Get immediate subdirectories of a directory
 */
function immediateSubdirs(rootDir: string): string[] {
  return fs.readdirSync(rootDir)
    .filter(name => fs.statSync(path.join(rootDir, name)).isDirectory());
}

/**
 * Copy assets from content directory to build directory
 */
function copyAssets(): [string, string][] {
  const copiedDirs: [string, string][] = [];
  for (const dir of immediateSubdirs('content')) {
    const randomId = randomString();
    const srcDir = path.join('content', dir);
    const dstDir = path.join('build', randomId);
    fs.mkdirSync(dstDir, { recursive: true });
    for (const filename of fs.readdirSync(srcDir)) {
      const srcFile = path.join(srcDir, filename);
      const dstFile = path.join(dstDir, filename);
      if (fs.statSync(srcFile).isFile()) {
        fsExtra.copySync(srcFile, dstFile);
      }
    }
    copiedDirs.push([dir, randomId]);
  }
  return copiedDirs;
}

/**
 * Create an HTML page using the page template and content
 */
function makePage(pageTemplate: pug.compileTemplate, htmlContent: string): [string, string] {
  const $ = cheerio.load(htmlContent);
  const h1Tags = $('h1');
  if (h1Tags.length > 1) {
    throw new Error('More than one <h1> found in the content');
  }
  if (h1Tags.length === 0) {
    throw new Error('No <h1> found in the content');
  }
  const title = h1Tags.first().text().trim();
  const output = pageTemplate({ title, content: htmlContent });

  return [output, title];
}

/**
 * Generate pages from markdown files
 */
function makePages(pageTemplate: pug.compileTemplate): [string, string, string][] {
  const pages = fs.readdirSync('content')
    .filter(f => f.endsWith('.md'))
    .map(f => f.slice(0, -3));
  const generatedPages: [string, string, string][] = [];
  for (const id of pages) {
    const mdContent = fs.readFileSync(`content/${id}.md`, 'utf-8');
    const pageHtmlContent = markdown.render(mdContent);
    const [output, title] = makePage(pageTemplate, pageHtmlContent);
    const secretId = randomString();
    fs.writeFileSync(`build/${secretId}.html`, output);
    generatedPages.push([id, secretId, title]);
  }
  return generatedPages;
}

/**
 * Generate the homepage
 */
function makeHomepage(
  homeTemplate: pug.compileTemplate,
  pageTemplate: pug.compileTemplate,
  generatedPages: [string, string, string][]
): string {
  const pages = generatedPages.map(([id, , title]) => [id, title] as [string, string]);
  const homeHtml = homeTemplate({ pages });
  const [output] = makePage(pageTemplate, homeHtml);
  const randomId = randomString();
  fs.writeFileSync(`build/${randomId}.html`, output);
  return randomId;
}

/**
 * Create .htaccess file for URL rewriting
 */
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
  fs.writeFileSync('build/.htaccess', htaccessContent);
}

/**
 * Main function to run the site generator
 */
export function run(): void {
  if (!fs.existsSync('build')) {
    fs.mkdirSync('build');
  }
  if (fs.existsSync('build')) {
    for (const file of fs.readdirSync('build')) {
      const filePath = path.join('build', file);
      fsExtra.removeSync(filePath);
    }
  }
  const pageTemplate = pug.compileFile('templates/page.pug');
  const homeTemplate = pug.compileFile('templates/home.pug');
  const generatedPages = makePages(pageTemplate);
  const homepageId = makeHomepage(homeTemplate, pageTemplate, generatedPages);
  const copiedDirs = copyAssets();
  makeHtaccess(generatedPages, copiedDirs, homepageId);
  console.log('Site generated successfully!');
}

run();
