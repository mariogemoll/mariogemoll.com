// SPDX-FileCopyrightText: 2025 Mario Gemoll
// SPDX-License-Identifier: 0BSD


export interface ParallelCorpusInfo {
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
  disclaimerContent?: string;
}

export type ParallelCorpusWithMetadataInfo = ParallelCorpusInfo & {
  metadataFileUrl: string;
  metadataIndexFileUrl: string;
  metadataMappingFileUrl: string;
};

export interface CommonCrawlAnnotation {
  srcSourceUrl: string;
  tgtSourceUrl: string;
  startLineIdx: number;
  numLines: number;
}

export interface NewstestDocInfo {
  docId: string;
  startLineIdx: number;
  numLines: number;
}

export interface Segment {
  startLineIdx: number;
  totalNumPairs: number;
  pairs: { src: string; tgt: string }[];
}

export type CommonCrawlSegment = Segment & {
  srcSourceUrl: string;
  tgtSourceUrl: string;
}

export type NewstestSegment = Segment & {
  docId: string;
}
