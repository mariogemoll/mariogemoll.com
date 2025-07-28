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
import { setUpSampling } from '../widgets/sampling.js';
import { Semaphore } from '../widgets/semaphore.js';
import { el, expandFloats, loadImage } from '../widgets/util.js';

declare global {
  interface Window {
    pica: () => pica.Pica;
    // eslint-disable-next-line @typescript-eslint/consistent-type-imports
    ort: typeof import('onnxruntime-web');
  }
}

const initiallySelectedModel = 8;

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

async function setUpModel(modelIdx: number): Promise<[encode: OrtFunction, decode: OrtFunction]> {
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

function showPlaceholder(box: HTMLDivElement): void {
  box.innerHTML = '<div class="placeholder" style="width: 700px; height: 300px;">Loading...</div>';
}
async function page(initialModelIdx: number): Promise<void> {

  const alphaGrid = makeStandardGrid(sizeRange, hueRange);

  const gridDataBufRes = await fetchFile('/vae/grids.bin');
  const gridDataBuf = await gridDataBufRes.arrayBuffer();
  const [, , gridData] = expandFloats(gridDataBuf);

  const lossesBufRes = await fetchFile('/vae/losses.bin');
  const lossesBuf = await lossesBufRes.arrayBuffer();

  const [minLoss, maxLoss, trainLosses, valLosses] = loadLosses(lossesBuf);

  const gridDataSliceSize = 100 * 10 * 10 * 2;

  const evolutionBox = el(document, '#evolution-widget') as HTMLDivElement;
  const modelComparisonBox = el(document, '#modelcomparison-widget') as HTMLDivElement;
  const datasetVisualizationBox = el(document, '#datasetvisualization-widget') as HTMLDivElement;
  const datasetExplanationBox = el(document, '#datasetexplanation-widget') as HTMLDivElement;
  const samplingBox = el(document, '#sampling-widget') as HTMLDivElement;
  const mappingBox = el(document, '#mapping-widget') as HTMLDivElement;
  const decodingBox = el(document, '#decoding-widget') as HTMLDivElement;

  const pica = window.pica();

  await setUpDatasetExplanation(
    pica,
    '/vae/face.png',
    alphaGrid,
    datasetExplanationBox
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
    datasetVisualizationBox,
    trainsetCoords.x,
    trainsetCoords.y,
    valsetCoords.x,
    valsetCoords.y,
    trainsetImages,
    valsetImages
  );


  async function showModelSpecificWidgets(modelIdx: number): Promise<void> {
    showPlaceholder(samplingBox);
    showPlaceholder(mappingBox);
    showPlaceholder(decodingBox);
    showPlaceholder(evolutionBox);
    showPlaceholder(modelComparisonBox);
    const [encode, decode] = await setUpModel(modelIdx);

    const img = await loadImage('/vae/face.png');
    const zGrid = await encodeGrid(window.ort, pica, img, encode, alphaGrid);

    await setUpSampling(window.ort, decode, samplingBox);

    await setUpMapping(
      window.ort,
      encode,
      decode,
      pica,
      '/vae/face.png',
      [[0.6, 0.9], [0.4, 0.7]],
      alphaGrid,
      zGrid,
      mappingBox
    );

    setUpDecoding(
      window.ort, decode, zGrid, decodingBox
    );

    setUpEvolution(
      evolutionBox,
      trainLosses[modelIdx],
      valLosses[modelIdx],
      gridData.slice(gridDataSliceSize * modelIdx, gridDataSliceSize * (modelIdx + 1))
    );

    let changingModel = false;
    setUpModelComparison(
      minLoss,
      maxLoss,
      trainLosses,
      valLosses,
      gridData,
      modelComparisonBox,
      modelIdx,
      (modelIndex) => {
        if (changingModel) {
          console.warn('Model change already in progress, ignoring click');
          return;
        }
        changingModel = true;
        showModelSpecificWidgets(modelIndex).then(() => {
          changingModel = false;
        }).catch((error: unknown) => {
          console.error(error);
          const errorMsg = error instanceof Error ? error.message : String(error);
          alert(`An error occurred while trying to change the model: ${errorMsg}`);
          changingModel = false;
        });
      });
  }

  await showModelSpecificWidgets(initialModelIdx);
}

window.addEventListener('load', () => {
  page(initiallySelectedModel).catch((error: unknown) => {
    console.error(error);
    alert(`Error during page setup: ${error instanceof Error ? error.message : String(error)}`);
  });
});
