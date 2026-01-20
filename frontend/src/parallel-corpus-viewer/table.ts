// SPDX-FileCopyrightText: 2025 Mario Gemoll
// SPDX-License-Identifier: 0BSD

import type { CommonCrawlSegment,NewstestSegment, Segment } from './types';

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
  const link = document.createElement('a');
  link.href = `#${(idx + 1).toString()}`;
  link.textContent = (idx + 1).toString();
  lineNumCell.appendChild(link);

  // src text
  const srcCell = document.createElement('td');
  srcCell.textContent = pair.src;

  // tgt text
  const tgtCell = document.createElement('td');
  tgtCell.textContent = pair.tgt;

  row.appendChild(lineNumCell);
  row.appendChild(srcCell);
  row.appendChild(tgtCell);
  tbody.appendChild(row);
  return row;
}

function addCommonCrawlMetadata(
  metadataCell: HTMLTableCellElement, srcLabelShort: string, tgtLabelShort: string,
  segment: CommonCrawlSegment
): void {
  metadataCell.appendChild(document.createTextNode(`${srcLabelShort} source: `));
  addSourceLink(metadataCell, segment.srcSourceUrl);
  metadataCell.appendChild(document.createTextNode(`, ${tgtLabelShort} source: `));
  addSourceLink(metadataCell, segment.tgtSourceUrl);
}

function addNewstestMetadata(
  metadataCell: HTMLTableCellElement, srcLabelShort: string, tgtLabelShort: string,
  segment: NewstestSegment
): void {
  metadataCell.appendChild(document.createTextNode(segment.docId));
}

type MetadataRowGenerator<T> = (
  metadataCell: HTMLTableCellElement, srcLabelShort: string, tgtLabelShort: string, segment: T
) => void;

export function addSegments<T extends Segment>(
  metadataRowGenerator: MetadataRowGenerator<T>,
  srcLabelShort: string, tgtLabelShort: string,
  tbody: HTMLTableSectionElement,
  startLineIdx: number, segments: T[], highlightIdx: number | undefined
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
    const startLineNumber = segment.startLineIdx + 1;
    const endLineNumber = startLineNumber + segment.totalNumPairs - 1;
    if (startLineNumber === endLineNumber) {
      metadataCell.innerHTML = `Line ${startLineNumber.toString()}: `;
    } else {
      metadataCell.innerHTML = `Lines ${startLineNumber.toString()}` +
        `\u2013${endLineNumber.toString()}: `;
    }

    metadataRowGenerator(metadataCell, srcLabelShort, tgtLabelShort, segment);

    metadataRow.appendChild(metadataCell);

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

export function addCommonCrawlSegments(
  srcLabelShort: string, tgtLabelShort: string, tbody: HTMLTableSectionElement,
  startLineIdx: number, segments: CommonCrawlSegment[], highlightIdx: number | undefined
): HTMLTableRowElement | undefined {
  return addSegments(
    addCommonCrawlMetadata, srcLabelShort, tgtLabelShort, tbody, startLineIdx, segments,
    highlightIdx
  );
}

export function addNewstestSegments(
  srcLabelShort: string, tgtLabelShort: string, tbody: HTMLTableSectionElement,
  startLineIdx: number, segments: NewstestSegment[], highlightIdx: number | undefined
): HTMLTableRowElement | undefined {
  return addSegments(
    addNewstestMetadata, srcLabelShort, tgtLabelShort, tbody, startLineIdx, segments, highlightIdx
  );
}

export function addPairs(
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
