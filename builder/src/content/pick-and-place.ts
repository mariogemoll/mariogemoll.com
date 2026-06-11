// SPDX-FileCopyrightText: 2026 Mario Gemoll
// SPDX-License-Identifier: 0BSD

import {
  addVisualizations,
  createMarkdownRenderer,
  loadPageData,
  processReferences,
  readMarkdownFile,
  type WidgetTuple
} from '../page-helpers.js';
import { type PageContentParams } from '../types.js';
import {
  highlightJsCssUrl,
  mathJaxUrl,
  threeGltfLoaderUrl,
  threeOrbitControlsUrl,
  threeStlLoaderUrl,
  threeUrl
} from './urls.js';

export async function generatePage(
  contentPath: string, pageTitle: string
): Promise<PageContentParams> {
  const md = createMarkdownRenderer({ useHighlightJs: true, useAnchor: true });

  let mdContent = await readMarkdownFile(contentPath, 'pick-and-place.md', pageTitle);

  const pageData = await loadPageData(contentPath, 'pick-and-place.json');

  mdContent = processReferences(mdContent, pageData);

  const visualizations: WidgetTuple[] = [
    ['robot', 1100, 520],
    ['robot-viewers', 1100, 460],
    ['grasp', 480, 260],
    ['canonical-grasp-pose', 900, 480],
    ['scripted-video', 800, 600],
    ['scripted-episode-replay', 720, 540],
    ['episode-grid-video', 800, 600],
    ['act-video', 720, 360, 'ACT in action']
  ];

  mdContent = addVisualizations(mdContent, visualizations);

  const html = md.render(mdContent);

  const cssFiles = [
    highlightJsCssUrl,
    '/misc/centered.css',
    '/misc/widgets.css',
    '/pick-and-place/pick-and-place.css',
    '/pick-and-place/page.css'
  ];

  const jsModuleUrls: string[] = ['/pick-and-place/pick-and-place.js'];

  const importMap: Record<string, string> = {
    'three': threeUrl,
    'three/examples/jsm/loaders/GLTFLoader.js': threeGltfLoaderUrl,
    'three/examples/jsm/controls/OrbitControls.js': threeOrbitControlsUrl,
    'three/examples/jsm/loaders/STLLoader.js': threeStlLoaderUrl
  };

  return [html, cssFiles, [mathJaxUrl], jsModuleUrls, importMap];
}
