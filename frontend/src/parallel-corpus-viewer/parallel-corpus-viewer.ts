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

function getQueryParams(): {
  corpus: string; from: number; to: number, highlight: number | undefined
  } {
  const params = new URLSearchParams(window.location.search);
  const corpus = params.get('corpus');
  if (corpus === null || corpus === '') {
    throw new Error('Missing "corpus" query parameter');
  }
  const fromRaw = params.get('from');
  if (fromRaw === null) {
    throw new Error('Missing "from" query parameter');
  }
  const from = parseInt(fromRaw, 10);
  if (isNaN(from) || from < 1) {
    throw new Error('Invalid "from" query parameter');
  }
  const toRaw = params.get('to');
  if (toRaw === null) {
    throw new Error('Missing "to" query parameter');
  }
  const to = parseInt(toRaw, 10);
  if (isNaN(to) || to < 1) {
    throw new Error('Invalid "to" query parameter');
  }
  if (from > to) {
    throw new Error('Invalid range: "from" is greater than "to"');
  }
  let highlight;
  const highlightRaw = window.location.hash;
  if (highlightRaw !== '') {
    const highlightVal = highlightRaw.slice(1);
    // Assert it contains only digits
    if (!/^\d+$/.test(highlightVal)) {
      throw new Error(`Invalid line number ${highlightRaw} in URL`);
    }
    highlight = parseInt(highlightVal, 10);
    if (isNaN(highlight) || highlight < 1) {
      throw new Error(`Invalid line number ${highlightRaw} in URL`);
    }
    if (highlight < from || highlight > to) {
      const rangeStr = `${from.toString()}\u2013${to.toString()}`;
      throw new Error(
        `Line number ${highlight.toString()} in URL is outside of range ${rangeStr}`
      );
    }
  }
  return { corpus, from, to, highlight };
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
  if (to - from > 1000) {
    throw new Error(`Invalid range: ${from.toString()}\u2013${toString()}. Max. 1000 entries.`);
  }

  if (!(corpus in corpora)) {
    throw new Error(`Corpus "${corpus}" not found in corpora list`);
  }

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
}

window.addEventListener('load', () => {
  page().catch((error: unknown) => {
    console.error(error);
    alert(`Error during page setup: ${error instanceof Error ? error.message : String(error)}`);
  });
});
