// SPDX-FileCopyrightText: 2025 Mario Gemoll
// SPDX-License-Identifier: 0BSD

import { el } from '../common/dom.js';
import { setUpBuckets } from './widgets/buckets.js';
import { loadMultipleLossData } from './widgets/data-loader';
import { initLineChartWidget } from './widgets/line-chart.js';
import { smoothData } from './widgets/stats';

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

async function page(): Promise<void> {
  const corporaBox = el(document, '#corpora-widget') as HTMLDivElement;
  const bucketsBox = el(document, '#buckets-widget') as HTMLDivElement;
  const trainLossBox = el(document, '#train-loss-widget') as HTMLDivElement;
  const lossBox = el(document, '#loss-widget') as HTMLDivElement;
  const bleuBox = el(document, '#bleu-widget') as HTMLDivElement;

  setUpBuckets(corporaBox, 1000, corpora, { minLabelPixelWidth: 50 });

  const buckets = bucketSizes.map((d, i) => {
    const start = i * bucketSeqLenStepSize + 1;
    const end = (i + 1) * bucketSeqLenStepSize;
    return { label: `${start.toString()}–${end.toString()}`, numEntries: d };
  });
  setUpBuckets(bucketsBox, batchSize, buckets, { minLabelPixelWidth: 44 });

  // Load multiple loss data files
  const lossData = await loadMultipleLossData([
    '/attention-is-all-you-need/loss_train.bin',
    '/attention-is-all-you-need/loss_train_epoch.bin',
    '/attention-is-all-you-need/loss_epoch_newstest2013.bin',
    '/attention-is-all-you-need/bleu_epoch_newstest2013.bin',
    '/attention-is-all-you-need/bleu_epoch_newstest2014.bin'
  ]);

  const [lossTrainSteps, lossTrainEpoch, loss2013, bleu2013, bleu2014] = lossData;

  // Smooth the step-level data and display
  initLineChartWidget(trainLossBox, [smoothData(lossTrainSteps, 0.001)], {
    labels: ['Training Loss']
  });

  initLineChartWidget(lossBox, [lossTrainEpoch, loss2013], {
    labels: ['Trainset', 'Newstest 2013'],
    showDots: true
  });

  initLineChartWidget(bleuBox, [bleu2013, bleu2014], {
    labels: ['Newstest 2013', 'Newstest 2014'],
    showDots: true
  });

}

window.addEventListener('load', () => {
  void page().catch((error: unknown) => {
    console.error(error);
    alert(`Error during page setup: ${error instanceof Error ? error.message : String(error)}`);
  });
});
