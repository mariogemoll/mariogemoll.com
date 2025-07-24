import type * as ort from 'onnxruntime-web';
import type { OrtFunction } from 'src/widgets/types/ortfunction.js';

import { hueRange, sizeRange } from '../widgets/constants.js';
import { setUpDatasetExplanation } from '../widgets/datasetexplanation.js';
import { setUpDatasetVisualization } from '../widgets/datasetvisualization.js';
import { setUpDecoding } from '../widgets/decoding.js';
import { setUpEvolution } from '../widgets/evolution.js';
import { encodeGrid, makeStandardGrid } from '../widgets/grid.js';
import { loadLosses } from '../widgets/lossdata.js';
import { setUpMapping } from '../widgets/mapping.js';
import { setUpModelComparison } from '../widgets/modelcomparison.js';
import { Semaphore } from '../widgets/semaphore.js';
import { el, expandFloats, loadImage } from '../widgets/util.js';

declare global {
  interface Window {
    pica: () => pica.Pica;
    // eslint-disable-next-line @typescript-eslint/consistent-type-imports
    ort: typeof import('onnxruntime-web');
  }
}

const modelIdx = 8;

async function fetchFile(url: string): Promise<Response> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  }
  return response;
}

async function fetchBytes(url: string): Promise<Uint8Array> {
  const response = await fetchFile(url);
  return response.bytes();
}

async function setUpModel(): Promise<[encode: OrtFunction, decode: OrtFunction]> {
  const encoderSession = await window.ort.InferenceSession.create(
    `/vae/vae_${modelIdx.toString()}_encoder.onnx`
  );
  const decoderSession = await window.ort.InferenceSession.create(
    `/vae/vae_${modelIdx.toString()}_decoder.onnx`
  );

  const encoderLock = new Semaphore(1);
  const decoderLock = new Semaphore(1);

  async function encode(imageTensor: ort.Tensor): Promise<ort.InferenceSession.ReturnType> {
    const feeds = { image: imageTensor };
    return await encoderLock.withLock(() => encoderSession.run(feeds));
  }

  async function decode(zTensor: ort.Tensor): Promise<ort.InferenceSession.ReturnType> {
    const feeds = { z: zTensor };
    return await decoderLock.withLock(() => decoderSession.run(feeds));
  }

  return [encode, decode];
}

async function page(): Promise<void> {

  const alphaGrid = makeStandardGrid(sizeRange, hueRange);

  const gridDataBufRes = await fetchFile('/vae/grids.bin');
  const gridDataBuf = await gridDataBufRes.arrayBuffer();
  const [, , gridData] = expandFloats(gridDataBuf);

  const lossesBufRes = await fetchFile('/vae/losses.bin');
  const lossesBuf = await lossesBufRes.arrayBuffer();

  const [minLoss, maxLoss, trainLosses, valLosses] = loadLosses(lossesBuf);

  const gridDataSliceSize = 100 * 10 * 10 * 2;


  setUpEvolution(
    el(document, '#evolution-widget') as HTMLDivElement,
    trainLosses[modelIdx],
    valLosses[modelIdx],
    gridData.slice(gridDataSliceSize * modelIdx, gridDataSliceSize * (modelIdx + 1))
  );

  setUpModelComparison(
    minLoss,
    maxLoss,
    trainLosses,
    valLosses,
    gridData,
    el(document, '#modelcomparison-widget') as HTMLDivElement
  );

  const pica = window.pica();

  await setUpDatasetExplanation(
    pica,
    '/vae/face.png',
    alphaGrid,
    el(document, '#datasetexplanation-widget') as HTMLDivElement
  );

  const [trainsetCoords, valsetCoords, trainsetImages, valsetImages] = await Promise.all([
    fetchFile('/vae/trainset_coords.json')
      .then(response => response.json()) as Promise<{ x: number[]; y: number[] }>,
    fetchFile('/vae/valset_coords.json')
      .then(response => response.json()) as Promise<{ x: number[]; y: number[] }>,
    fetchBytes('/vae/trainset_images.bin'),
    fetchBytes('/vae/valset_images.bin')
  ]);

  setUpDatasetVisualization(
    el(document, '#datasetvisualization-widget') as HTMLDivElement,
    trainsetCoords.x,
    trainsetCoords.y,
    valsetCoords.x,
    valsetCoords.y,
    trainsetImages,
    valsetImages
  );

  const [encode, decode] = await setUpModel();

  const img = await loadImage('/vae/face.png');
  const zGrid = await encodeGrid(window.ort, pica, img, encode, alphaGrid);

  await setUpMapping(
    window.ort,
    encode,
    decode,
    pica,
    '/vae/face.png',
    [[0.6, 0.9], [0.4, 0.7]],
    alphaGrid,
    zGrid,
    el(document, '#mapping-widget') as HTMLDivElement
  );

  setUpDecoding(
    window.ort, decode, zGrid, el(document, '#decoding-widget') as HTMLDivElement
  );

}

window.addEventListener('load', () => {
  page().catch((error: unknown) => {
    console.error(error);
    alert(`Error during page setup: ${error instanceof Error ? error.message : String(error)}`);
  });
});
