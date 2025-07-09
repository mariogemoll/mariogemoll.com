import type * as ort from 'onnxruntime-web';
import type { OrtFunction } from 'src/widgets/types/ortfunction.js';

import { sizeRange, hueRange } from '../widgets/constants.js';
import { setUpDatasetExplanation } from '../widgets/datasetexplanation.js';
import { setUpDecoding } from '../widgets/decoding.js';
import { encodeGrid, makeStandardGrid } from '../widgets/grid.js';
import { setUpMapping } from '../widgets/mapping.js';
import { Semaphore } from '../widgets/semaphore.js';
import { el, loadImage } from '../widgets/util.js';

declare global {
  interface Window {
    pica: () => pica.Pica;
    // eslint-disable-next-line @typescript-eslint/consistent-type-imports
    ort: typeof import('onnxruntime-web');
  }
}

async function setUpModel(): Promise<[encode: OrtFunction, decode: OrtFunction]> {
  const encoderSession = await window.ort.InferenceSession.create('/encoder.onnx');
  const decoderSession = await window.ort.InferenceSession.create('/decoder.onnx');

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

  const pica = window.pica();

  const alphaGrid = makeStandardGrid(sizeRange, hueRange);

  await setUpDatasetExplanation(
    pica,
    '/vae/face.png',
    alphaGrid,
    el(document, '#datasetexplanation-widget > div') as HTMLDivElement);


  const [encode, decode] = await setUpModel();

  const img = await loadImage('/vae/face.png');
  const zGrid = await encodeGrid(window.ort, pica, img, encode, alphaGrid);

  await setUpMapping(
    window.ort,
    encode,
    decode,
    pica,
    '/vae/face.png',
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
    console.error('Error during page load:', error);
  });
});
