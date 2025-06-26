import { hsvToRgb } from './util.js';

function pixelVal(value: number): string {
  return Math.floor(value * 255).toString();
}

export async function renderSample(
  picaInstance: pica.Pica,
  hiresCanvas: HTMLCanvasElement,
  downsampledCanvas: HTMLCanvasElement,
  img: HTMLImageElement,
  radius: number,
  hue: number): Promise<void> {
  const hiresCtx = hiresCanvas.getContext('2d');
  if (!hiresCtx) {
    throw new Error('Failed to get 2D context from hiresCanvas');
  }
  // const downsampledCtx = downsampledCanvas.getContext('2d');
  const bigSize = 128;

  // Fill HSV background
  const [r, g, b] = hsvToRgb(hue, 0.8, 0.8);
  hiresCtx.fillStyle = `rgb(${pixelVal(r)}, ${pixelVal(g)}, ${pixelVal(b)})`;
  hiresCtx.fillRect(0, 0, bigSize, bigSize);

  // Scale and draw image
  const imgW = img.naturalWidth;
  const imgH = img.naturalHeight;
  const scale = radius * bigSize / Math.max(imgW, imgH);

  hiresCtx.save();
  hiresCtx.translate(bigSize / 2, bigSize / 2);
  hiresCtx.scale(scale, scale);
  hiresCtx.translate(-imgW / 2, -imgH / 2);
  hiresCtx.drawImage(img, 0, 0);
  hiresCtx.restore();

  // Use pica to downsample
  await picaInstance.resize(hiresCanvas, downsampledCanvas, { filter: 'lanczos3' });
}
