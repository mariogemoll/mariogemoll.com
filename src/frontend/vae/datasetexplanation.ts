import { sizeRange, hueRange } from './constants.js';
import { renderSample } from './dataset.js';
import { setUp2dSelector } from './twodselector.js';
import { el, loadImage, map01ToRange } from './util.js';


export async function setUpDatasetExplanation(
  picaInstance: pica.Pica, faceImgUrl: string, box: HTMLDivElement): Promise<void> {
  try {
    const alphaSvg: SVGSVGElement = el(box, 'svg.alpha-space') as SVGSVGElement;
    const imgCanvas: HTMLCanvasElement = el(box, 'canvas.pic') as HTMLCanvasElement;
    const sizeSpan: HTMLSpanElement = el(box, '.dataset-explanation-size span') as HTMLSpanElement;
    const hueSpan: HTMLSpanElement = el(box, '.dataset-explanation-hue span') as HTMLSpanElement;
    const hiresCanvas = document.createElement('canvas');
    hiresCanvas.width = 128;
    hiresCanvas.height = 128;
    const img = await loadImage(faceImgUrl);

    let working = false;

    setUp2dSelector(alphaSvg, (x, y) => {
      if (working) {return;} // Prevent multiple simultaneous renders
      working = true;
      (async(): Promise<void> => {
        const size = map01ToRange(sizeRange, x);
        const hue = map01ToRange(hueRange, y);
        sizeSpan.textContent = size.toFixed(2);
        hueSpan.textContent = hue.toFixed(2);
        await renderSample(picaInstance, hiresCanvas, imgCanvas, img, size, hue);
        working = false;
      })().catch((error: unknown) => {
        console.error('Error rendering sample:', error);
      });
    });
  } catch (error: unknown) {
    console.error('Error setting up dataset explanation:', error);
    let msg = 'Unknown error';
    if (error instanceof Error) {
      msg = error.message;
    }
    box.innerHTML = `<p>Error setting up dataset explanation: ${msg}</p>`;
  }
}
