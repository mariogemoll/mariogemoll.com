// SPDX-FileCopyrightText: 2025 Mario Gemoll
// SPDX-License-Identifier: 0BSD

import {
  getCommonCrawlSegments, getCorporaInfo,getNewstestLines, getSrcAndTgtLines
} from './data-retrieval';
import { addCommonCrawlSegments, addNewstestSegments,addPairs } from './table';
import type { ParallelCorpusInfo, ParallelCorpusWithMetadataInfo } from './types';

function el(parent: Document | Element, query: string): Element {
  const element = parent.querySelector(query);
  if (!element) {
    throw new Error(`Element for query ${query} not found`);
  }
  return element;
}

function validateCorpus(
  corpus: string | null, corpora?: Record<string, ParallelCorpusInfo>
): string {
  if (corpus === null || corpus === '') {
    throw new Error('Missing "corpus" query parameter');
  }
  if (corpora && !(corpus in corpora)) {
    throw new Error(`Corpus "${corpus}" not found in corpora list`);
  }
  return corpus;
}

function validateLineNumber(value: string | null, paramName: string): number {
  if (value === null) {
    throw new Error(`Missing "${paramName}" query parameter`);
  }
  const num = parseInt(value, 10);
  if (isNaN(num) || num < 1) {
    throw new Error(`Invalid "${paramName}" query parameter`);
  }
  return num;
}

function validateLineRange(from: number, to: number, corpusSize?: number): void {
  if (from > to) {
    throw new Error('Invalid range: "from" is greater than "to"');
  }
  if (to - from > 1000) {
    throw new Error(`Invalid range: ${from.toString()}\u2013${to.toString()}. Max. 1000 entries.`);
  }
  if (corpusSize !== undefined && to > corpusSize) {
    throw new Error(
      `Invalid "to" value: ${to.toString()} exceeds corpus size of ${corpusSize.toString()}`
    );
  }
}

function validateHighlight(highlightRaw: string, from: number, to: number): number | undefined {
  if (highlightRaw === '') {
    return undefined;
  }
  const highlightVal = highlightRaw.slice(1);
  // Assert it contains only digits
  if (!/^\d+$/.test(highlightVal)) {
    throw new Error(`Invalid line number ${highlightRaw} in URL`);
  }
  const highlight = parseInt(highlightVal, 10);
  if (isNaN(highlight) || highlight < 1) {
    throw new Error(`Invalid line number ${highlightRaw} in URL`);
  }
  if (highlight < from || highlight > to) {
    const rangeStr = `${from.toString()}\u2013${to.toString()}`;
    throw new Error(
      `Line number ${highlight.toString()} in URL is outside of range ${rangeStr}`
    );
  }
  return highlight;
}

function validateFormData(formData: FormData, corpora: Record<string, ParallelCorpusInfo>): void {
  const corpus = validateCorpus(formData.get('corpus') as string, corpora);
  const corpusSize = corpora[corpus].numPairs;
  const from = validateLineNumber(formData.get('from') as string, 'from');
  const to = validateLineNumber(formData.get('to') as string, 'to');
  validateLineRange(from, to, corpusSize);
  // Note: We don't validate highlight here since form submission clears the hash
}

function getQueryParams(): {
  corpus: string; from: number; to: number, highlight: number | undefined
  } {
  const params = new URLSearchParams(window.location.search);
  const corpus = validateCorpus(params.get('corpus')); // Basic validation without corpora check
  const from = validateLineNumber(params.get('from'), 'from');
  const to = validateLineNumber(params.get('to'), 'to');
  validateLineRange(from, to); // Basic validation without corpus size check
  const highlight = validateHighlight(window.location.hash, from, to);
  return { corpus, from, to, highlight };
}

function validateQueryParamsWithCorpora(
  corpus: string, from: number, to: number,
  corpora: Record<string, ParallelCorpusInfo>
): void {
  validateCorpus(corpus, corpora);
  const corpusSize = corpora[corpus].numPairs;
  validateLineRange(from, to, corpusSize);
}

function populateCorpusSelect(
  selectElem: HTMLSelectElement, corpora: Record<string, ParallelCorpusInfo>
): void {
  for (const [key, info] of Object.entries(corpora)) {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = info.name;
    selectElem.appendChild(option);
  }
}

function updateDisclaimerBar(corpus: string, corpora: Record<string, ParallelCorpusInfo>): void {
  const disclaimerText = el(document, '#disclaimer-text');
  const corpusInfo = corpora[corpus];

  let disclaimerContent = '<strong>Disclaimer:</strong> ';

  // Get disclaimer content from corpora.json if available
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (corpusInfo.disclaimerContent !== undefined && corpusInfo.disclaimerContent !== null) {
    // Convert markdown-style links [text](url) to HTML links
    const contentWithLinks = corpusInfo.disclaimerContent.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener">$1</a>'
    );
    disclaimerContent += contentWithLinks;
  } else {
    // Fallback to generic disclaimer
    disclaimerContent += `Dataset: ${corpusInfo.name}. This tool is for research and educational '`;
    disclaimerContent += 'purposes only. Users are responsible for ensuring their use complies ';
    disclaimerContent += 'with applicable copyright laws. If you believe that any content shown ';
    disclaimerContent += 'here infringes your rights or should not be included, please contact me ';
    disclaimerContent += 'and I will address the issue promptly.';
  }

  disclaimerText.innerHTML = disclaimerContent;
}

async function page(): Promise<void> {
  // Redirect if no query params
  if (!window.location.search || window.location.search === '' || window.location.search === '?') {
    window.location.replace('/parallel-corpus-viewer?corpus=commoncrawl-deen&from=1&to=1000');
    return;
  }

  const corpora = await getCorporaInfo('/parallel-corpus-viewer/corpora.json');

  const corpusSelect = el(document, '#corpus-selection') as HTMLSelectElement;
  populateCorpusSelect(corpusSelect, corpora);

  const { corpus, from, to, highlight } = getQueryParams();

  // Validate with corpus information
  validateQueryParamsWithCorpora(corpus, from, to, corpora);

  // Select corpus
  corpusSelect.value = corpus;

  // Update page title
  document.title = corpora[corpus].name;

  const fromLineInput = el(document, '#from-line') as HTMLInputElement;
  fromLineInput.value = from.toString();

  const toLineInput = el(document, '#to-line') as HTMLInputElement;
  toLineInput.value = to.toString();

  const corpusInfoElem = el(document, '#corpus-info');
  corpusInfoElem.textContent = `${corpora[corpus].numPairs.toString()} lines`;

  const startIdx = from - 1;
  const numPairs = to - from + 1;
  const tbody = el(document, '#parallelTableBody') as HTMLTableSectionElement;

  const corpusInfo = corpora[corpus];
  let highlightRow;
  if (corpus === 'commoncrawl-deen') {
    const ccSegments = await getCommonCrawlSegments(
      corpusInfo as ParallelCorpusWithMetadataInfo, startIdx, numPairs
    );
    highlightRow = addCommonCrawlSegments(
      corpusInfo.srcLabel, corpusInfo.tgtLabel, tbody, startIdx, ccSegments,
      highlight === undefined ? undefined : highlight - 1
    );
  } else if (corpus === 'newstest2014-deen') {
    const ntSegments = await getNewstestLines(
      corpusInfo as ParallelCorpusWithMetadataInfo, startIdx, numPairs
    );
    highlightRow = addNewstestSegments(
      corpusInfo.srcLabel, corpusInfo.tgtLabel, tbody, startIdx, ntSegments,
      highlight === undefined ? undefined : highlight - 1
    );
  } else {
    const [srcLines, tgtLines] = await getSrcAndTgtLines(
      corpusInfo.srcIndexFileUrl, corpusInfo.srcTextFileUrl,
      corpusInfo.tgtIndexFileUrl, corpusInfo.tgtTextFileUrl,
      startIdx, numPairs
    );
    const pairs = srcLines.map((src, i) => ({ src, tgt: tgtLines[i] }));
    highlightRow = addPairs(
      tbody, startIdx, pairs,
      highlight === undefined ? undefined : highlight - 1
    );
  }
  if (highlightRow !== undefined) {
    highlightRow.scrollIntoView({ behavior: 'auto', block: 'center' });
  }

  // Update disclaimer bar based on corpus
  updateDisclaimerBar(corpus, corpora);

  // Add form submit handler to clear hash and validate form data
  const form = el(document, '#nav') as HTMLFormElement;
  form.addEventListener('submit', (event) => {
    try {
      // Validate form data before submission
      const formData = new FormData(form);
      validateFormData(formData, corpora);

      // Clear the hash when the form is submitted to avoid confusion
      // with the new content that will be loaded
      if (window.location.hash) {
        history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    } catch (error) {
      // Prevent form submission if validation fails
      event.preventDefault();
      alert(`Invalid form data: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
}

window.addEventListener('load', () => {
  page().catch((error: unknown) => {
    console.error(error);
    alert(`Error during page setup: ${error instanceof Error ? error.message : String(error)}`);
  });
});

window.addEventListener('hashchange', () => {
  // Handle hash changes for scroll into view without reloading the page
  const hash = window.location.hash;
  if (hash && hash.length > 1) {
    const lineNumber = hash.slice(1);
    // Validate it's a number
    if (/^\d+$/.test(lineNumber)) {
      const targetRow = el(document, `#line-${lineNumber}`) as HTMLTableRowElement;
      // Remove existing highlights
      const existingHighlight = document.querySelector('tr.highlight-row');
      if (existingHighlight) {
        existingHighlight.classList.remove('highlight-row');
      }
      // Add highlight to new row
      targetRow.classList.add('highlight-row');
      // Scroll to the row
      targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
});
