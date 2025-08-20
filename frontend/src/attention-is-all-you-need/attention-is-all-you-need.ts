import { el } from '../common/dom.js';
import { setUpBuckets } from './widgets/buckets.js';

const corpora = [
  { label: 'europarl v7', numEntries: 1920209 },
  { label: 'commoncrawl', numEntries: 2399123 },
  { label: 'news commentary v9', numEntries: 201288 },
  { label: 'newstest 2013', numEntries: 3000 },
  { label: 'newstest 2014', numEntries: 3003 }
];

const bucketSizes =  [
  744850, 1915390, 1101320, 435248, 157047, 56598, 21731, 8917, 4029, 2215, 1172
];

const bucketSeqLenStepSize = 16;

const batchSize = 1000;

function page(): void {
  const corporaBox = el(document, '#corpora-widget') as HTMLDivElement;
  const bucketsBox = el(document, '#buckets-widget') as HTMLDivElement;

  setUpBuckets(corporaBox, 1000, corpora, { minLabelPixelWidth: 50 });

  const buckets = bucketSizes.map((d, i) => {
    const start = i * bucketSeqLenStepSize + 1;
    const end = (i + 1) * bucketSeqLenStepSize;
    return { label: `${start.toString()}–${end.toString()}`, numEntries: d };
  });
  setUpBuckets(bucketsBox, batchSize, buckets, { minLabelPixelWidth: 44 });
}

window.addEventListener('load', () => {
  try {
    page();
  } catch (error: unknown) {
    console.error(error);
    alert(`Error during page setup: ${error instanceof Error ? error.message : String(error)}`);
  }
});
