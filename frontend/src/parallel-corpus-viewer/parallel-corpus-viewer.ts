import { getStartAndEndPos } from './indexed-files';
import { getLines } from './indexed-text-files';

interface ParallelCorpusInfo {
  name: string;
  numPairs: number;
  srcLabel: string;
  tgtLabel: string;
  srcLabelLong: string;
  tgtLabelLong: string;
  srcTextFileUrl: string;
  srcIndexFileUrl: string;
  tgtTextFileUrl: string;
  tgtIndexFileUrl: string;
}

type CommonCrawlInfo = ParallelCorpusInfo & {
  annotationsTextFileUrl: string;
  annotationsIndexFileUrl: string;
  annotationsForLinesFileUrl: string;
};

interface CommonCrawlAnnotation {
  srcSourceUrl: string;
  tgtSourceUrl: string;
  startLineIdx: number;
  numLines: number;
}

interface CommonCrawlSegment {
  startLineIdx: number;
  srcSourceUrl: string;
  tgtSourceUrl: string;
  pairs: { src: string; tgt: string }[];
}

function el(parent: Document | Element, query: string): Element {
  const element = parent.querySelector(query);
  if (!element) {
    throw new Error(`Element for query ${query} not found`);
  }
  return element;
}

function parseCommonCrawlAnnotationLine(line: string): CommonCrawlAnnotation {
  const parts = line.split('\t');
  if (parts.length !== 4) {
    throw new Error(`Invalid annotation line: ${line}`);
  }
  return {
    srcSourceUrl: parts[0],
    tgtSourceUrl: parts[1],
    startLineIdx: parseInt(parts[2], 10),
    numLines: parseInt(parts[3], 10)
  };
}

async function getCommonCrawlAnnotations(
  urls: CommonCrawlInfo, startIdx: number, numLines: number
): Promise<CommonCrawlAnnotation[]> {
  const [annoStart, annoEnd] = await getStartAndEndPos(
    urls.annotationsForLinesFileUrl, startIdx, numLines
  );

  const lines = await getLines(
    urls.annotationsIndexFileUrl, urls.annotationsTextFileUrl, annoStart, annoEnd + 1
  );
  return lines.map(parseCommonCrawlAnnotationLine);
}

function getSrcAndTgtLines(
  srcIndexFileUrl: string, srcTextFileUrl: string, tgtIndexFileUrl: string, tgtTextFileUrl: string,
  startIdx: number, numLines: number
): Promise<[string[], string[]]> {
  return Promise.all([
    getLines(srcIndexFileUrl, srcTextFileUrl, startIdx, numLines),
    getLines(tgtIndexFileUrl, tgtTextFileUrl, startIdx, numLines)
  ]);
}

async function getCommonCrawlLines(
  urls: CommonCrawlInfo, startIdx: number, numLines: number
): Promise<CommonCrawlSegment[]> {
  const [srcAndTgtLines, annotationData] = await Promise.all([
    getSrcAndTgtLines(
      urls.srcIndexFileUrl, urls.srcTextFileUrl,
      urls.tgtIndexFileUrl, urls.tgtTextFileUrl,
      startIdx, numLines
    ),
    getCommonCrawlAnnotations(urls, startIdx, numLines)
  ]);
  const [srcLines, tgtLines] = srcAndTgtLines;

  const segments: CommonCrawlSegment[] = [];
  let currentSegment: CommonCrawlSegment = {
    startLineIdx: annotationData[0].startLineIdx,
    srcSourceUrl: annotationData[0].srcSourceUrl,
    tgtSourceUrl: annotationData[0].tgtSourceUrl,
    pairs: []
  };
  segments.push(currentSegment);

  let currentAnnotationDataIdx = 0;
  for (let i = 0; i < numLines; i++) {
    const lineIdx = startIdx + i;
    let currentAnnotation = annotationData[currentAnnotationDataIdx];
    if (lineIdx > currentAnnotation.startLineIdx + currentAnnotation.numLines - 1) {
      currentAnnotationDataIdx += 1;
      currentAnnotation = annotationData[currentAnnotationDataIdx];
      if (lineIdx !== currentAnnotation.startLineIdx) {
        throw new Error('invalid line number in annotation');
      }
      currentSegment = {
        startLineIdx: currentAnnotation.startLineIdx,
        srcSourceUrl: currentAnnotation.srcSourceUrl,
        tgtSourceUrl: currentAnnotation.tgtSourceUrl,
        pairs: []
      };
      segments.push(currentSegment);
    }
    const srcLine = srcLines[lineIdx - startIdx];
    const tgtLine = tgtLines[lineIdx - startIdx];
    currentSegment.pairs.push({ src: srcLine, tgt: tgtLine });
  }

  return segments;

}

function addSourceLink(parent: HTMLElement, url: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.innerText = url.length > 80 ? (url.slice(0, 80) + '…') : url;
  parent.appendChild(a);
}

function addTableRow(
  tbody: HTMLTableSectionElement,
  idx: number,
  pair: { src: string; tgt: string },
  isOdd: boolean,
  isHighlighted: boolean
): HTMLTableRowElement {
  const row = document.createElement('tr');
  if (isHighlighted) {
    row.className = 'highlight-row';
  } else if (isOdd) {
    row.className = 'odd-segment';
  }
  row.id = `line-${(idx + 1).toString()}`;

  // Line number
  const lineNumCell = document.createElement('td');
  lineNumCell.className = 'line-num';
  lineNumCell.textContent = (idx + 1).toString();

  // src text
  const deCell = document.createElement('td');
  deCell.textContent = pair.tgt;

  // tgt text
  const enCell = document.createElement('td');
  enCell.textContent = pair.src;

  row.appendChild(lineNumCell);
  row.appendChild(deCell);
  row.appendChild(enCell);
  tbody.appendChild(row);
  return row;
}

function addCommonCrawlSegments(
  tbody: HTMLTableSectionElement, srcLabelShort: string, tgtLabelShort: string,
  startLineIdx: number, segments: CommonCrawlSegment[], highlightIdx: number | undefined
): HTMLTableRowElement | undefined {
  tbody.innerHTML = '';
  let idx = startLineIdx;
  let highlightRow: HTMLTableRowElement | undefined = undefined;
  for (let segmentIdx = 0; segmentIdx < segments.length; segmentIdx++) {
    const segment = segments[segmentIdx];
    const metadataRow = document.createElement('tr');
    metadataRow.classList.add('metadata');
    const isOdd = segmentIdx % 2 === 1;
    if (isOdd) {
      metadataRow.classList.add('odd-segment');
    }
    const metadataCell = document.createElement('td');
    metadataCell.colSpan = 3;
    metadataRow.appendChild(metadataCell);
    const startLineNumber = idx + 1;
    const endLineNumber = startLineNumber + segment.pairs.length - 1;
    if (startLineNumber === endLineNumber) {
      metadataCell.innerHTML = `Line ${startLineNumber.toString()}: `;
    } else {
      metadataCell.innerHTML = `Lines ${startLineNumber.toString()}` +
        `\u2013${endLineNumber.toString()}: `;
    }
    metadataCell.appendChild(document.createTextNode(`${srcLabelShort} source: `));
    addSourceLink(metadataCell, segment.srcSourceUrl);
    metadataCell.appendChild(document.createTextNode(`, ${tgtLabelShort} source: `));
    addSourceLink(metadataCell, segment.tgtSourceUrl);

    tbody.appendChild(metadataRow);

    for (const pair of segment.pairs) {
      const isHighlighted = highlightIdx === idx;
      const row = addTableRow(tbody, idx, pair, isOdd, isHighlighted);
      if (isHighlighted) {
        highlightRow = row;
      }
      idx++;
    }

  }

  return highlightRow;
}

function addPairs(
  tbody: HTMLTableSectionElement,
  startLineIdx: number,
  pairs: { src: string; tgt: string }[],
  highlightIdx: number | undefined
): HTMLTableRowElement | undefined {
  tbody.innerHTML = '';
  let idx = startLineIdx;
  let highlightRow: HTMLTableRowElement | undefined = undefined;

  for (const pair of pairs) {
    const isHighlighted = highlightIdx === idx;
    const row = addTableRow(tbody, idx, pair, false, isHighlighted);
    if (isHighlighted) {
      highlightRow = row;
    }
    idx++;
  }

  return highlightRow;
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

function loadCorporaInfo(
  url: string
): Promise<Record<string, ParallelCorpusInfo | CommonCrawlInfo>> {
  return fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to load corpora: ${response.statusText}`);
      }
      return response.json();
    });
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

  const corpora = await loadCorporaInfo('/parallel-corpus-viewer/corpora.json');

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
    const ccSegments = await getCommonCrawlLines(corpusInfo as CommonCrawlInfo, startIdx, numPairs);
    highlightRow = addCommonCrawlSegments(
      tbody, corpusInfo.srcLabel, corpusInfo.tgtLabel, startIdx, ccSegments,
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
