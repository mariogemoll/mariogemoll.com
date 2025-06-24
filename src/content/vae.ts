import fsExtra from 'fs-extra';
import MarkdownIt from 'markdown-it';
import mathjax3 from 'markdown-it-mathjax3';

export async function generatePage(): Promise<[string, string[], string[]]> {
  const md = new MarkdownIt({
    html: true,
    linkify: true
  }).use(mathjax3);
  const mdContent = await fsExtra.readFile('content/vae.md', 'utf-8');
  const html = md.render(mdContent);
  const cssFiles = ['/vae/vae.css'];
  const jsFiles = ['/vae/vae.js'];
  return [html, cssFiles, jsFiles];
}
