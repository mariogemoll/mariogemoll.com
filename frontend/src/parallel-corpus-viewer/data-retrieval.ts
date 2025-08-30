
import { getStartAndEndPos } from './indexed-files';
import { getLines } from './indexed-text-files';
import type {
  CommonCrawlAnnotation, CommonCrawlSegment, NewstestDocInfo, NewstestSegment,ParallelCorpusInfo,
  ParallelCorpusWithMetadataInfo
} from './types';

export function getCorporaInfo(
  url: string
): Promise<Record<string, ParallelCorpusInfo | ParallelCorpusWithMetadataInfo>> {
  return fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to load corpora: ${response.statusText}`);
      }
      return response.json();
    });
}

async function getMetadataLines(
  metadataMappingFileUrl: string,
  metadataIndexFileUrl: string,
  metadataFileUrl: string,
  startIdx: number,
  numLines: number
): Promise<string[]> {
  // The metadata file is a text file containing metadata for each section in the dataset. Each line
  // looks like this: METADATA \t startLineIdx \t numLines \n
  // (The metadata index file contains the locations of the line break bytes in the text file for
  // easy retrieval of individual lines from large text files.)
  // The metadata mapping file contains the line index in the metadata file for each entry in the
  // dataset. Since both the dataset itself as well as the metadata are stored in order, we only
  // need to look at the indices of the first and last pair of the range we're interested in, and
  // retrieve everything between them.
  const [start, end] = await getStartAndEndPos(
    metadataMappingFileUrl, startIdx, numLines
  );
  return getLines(metadataIndexFileUrl, metadataFileUrl, start, end + 1);
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
  urls: ParallelCorpusWithMetadataInfo, startIdx: number, numLines: number
): Promise<CommonCrawlAnnotation[]> {
  const lines = await getMetadataLines(
    urls.metadataMappingFileUrl, urls.metadataIndexFileUrl, urls.metadataFileUrl, startIdx, numLines
  );
  return lines.map(parseCommonCrawlAnnotationLine);
}

function parseNewstestDocInfoLine(line: string): NewstestDocInfo {
  const parts = line.split('\t');
  if (parts.length !== 3) {
    throw new Error(`Invalid document info line: ${line}`);
  }
  return {
    docId: parts[0],
    startLineIdx: parseInt(parts[1], 10),
    numLines: parseInt(parts[2], 10)
  };
}

async function getNewstestMetadata(
  urls: ParallelCorpusWithMetadataInfo, startIdx: number, numLines: number
): Promise<NewstestDocInfo[]> {
  const lines = await getMetadataLines(
    urls.metadataMappingFileUrl, urls.metadataIndexFileUrl, urls.metadataFileUrl, startIdx, numLines
  );
  return lines.map(parseNewstestDocInfoLine);
}

export function getSrcAndTgtLines(
  srcIndexFileUrl: string, srcTextFileUrl: string, tgtIndexFileUrl: string, tgtTextFileUrl: string,
  startIdx: number, numLines: number
): Promise<[string[], string[]]> {
  return Promise.all([
    getLines(srcIndexFileUrl, srcTextFileUrl, startIdx, numLines),
    getLines(tgtIndexFileUrl, tgtTextFileUrl, startIdx, numLines)
  ]);
}

export async function getCommonCrawlSegments(
  urls: ParallelCorpusWithMetadataInfo, startIdx: number, numLines: number
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

export async function getNewstestLines(
  urls: ParallelCorpusWithMetadataInfo, startIdx: number, numLines: number
): Promise<NewstestSegment[]> {
  const [srcAndTgtLines, metadata] = await Promise.all([
    getSrcAndTgtLines(
      urls.srcIndexFileUrl, urls.srcTextFileUrl,
      urls.tgtIndexFileUrl, urls.tgtTextFileUrl,
      startIdx, numLines
    ),
    getNewstestMetadata(urls, startIdx, numLines)
  ]);
  const [srcLines, tgtLines] = srcAndTgtLines;

  const segments: NewstestSegment[] = [];
  let currentSegment: NewstestSegment = {
    startLineIdx: metadata[0].startLineIdx,
    docId: metadata[0].docId,
    pairs: []
  };
  segments.push(currentSegment);

  let currentMetadataIdx = 0;
  for (let i = 0; i < numLines; i++) {
    const lineIdx = startIdx + i;
    let currentMetadataEntry = metadata[currentMetadataIdx];
    if (lineIdx > currentMetadataEntry.startLineIdx + currentMetadataEntry.numLines - 1) {
      currentMetadataIdx += 1;
      currentMetadataEntry = metadata[currentMetadataIdx];
      if (lineIdx !== currentMetadataEntry.startLineIdx) {
        throw new Error('invalid line number in metadata');
      }
      currentSegment = {
        startLineIdx: currentMetadataEntry.startLineIdx,
        docId: currentMetadataEntry.docId,
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
