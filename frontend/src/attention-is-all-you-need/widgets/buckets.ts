
import { getContext } from '../../common/canvas.js';
import { addCanvas, addDiv, addErrorMessage, removePlaceholder } from '../../common/dom.js';

interface BucketsInfo { label: string, numEntries: number }

function arraySum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
}

export interface BucketsWidgetOptions {
  // size of a single box in CSS px
  boxSize?: number;

  // number of boxes vertically before wrapping to next column
  boxesPerColumn?: number;

  // if set, scales the canvas down to this width while keeping internal resolution
  maxCanvasWidth?: number;

  // minimum allocated pixel width for each bucket group (for label readability)
  minBucketPixelWidth?: number;

  // minimum width used for wrapping labels (can exceed bucket width)
  minLabelPixelWidth?: number;
}

export function setUpBuckets(
  box: HTMLDivElement, batchSize: number, buckets: BucketsInfo[], options: BucketsWidgetOptions = {}
): void {
  try {

    removePlaceholder(box);

    const widget = addDiv(box, {}, { position: 'relative' });

    const BOX = options.boxSize ?? 4;
    const GAP = 1;
    const HEIGHT_BOXES = options.boxesPerColumn ?? 30;       // fixed height in boxes
    const GROUP_X_GAP = 20;
    const TOP_PAD = 10;
    const LABEL_PAD = 20;
    const DPR = Math.max(1, window.devicePixelRatio || 1);

    const canvas = addCanvas(widget, {}, {});

    const ctx = getContext(canvas);
    ctx.imageSmoothingEnabled = false;

    // compute boxes per bucket
    const groupBoxes = buckets.map(d => Math.ceil(d.numEntries / batchSize));
    const groupCols  = groupBoxes.map(b => Math.ceil(b / HEIGHT_BOXES));
    const groupWRaw  = groupCols.map(c => c * (BOX + GAP) - GAP); // width needed for boxes only
    const minBucketWidth = options.minBucketPixelWidth ?? 0;
    const minLabelWidth  = options.minLabelPixelWidth ?? 30;
    // Width actually used to draw boxes (respecting min bucket width)
    const groupWBoxes  = groupWRaw.map(w => Math.max(w, minBucketWidth));
    // Layout width (may expand further to satisfy label min width for wrapping / centering)
    const groupWLayout = groupWBoxes.map(w => Math.max(w, minLabelWidth));

    const tallestH   = HEIGHT_BOXES * (BOX + GAP) - GAP;

    // Set font early so measurement reflects final rendering (we'll reuse in draw)
    const PREVIEW_FONT_PX = 11; // base font size in CSS px
    const LINE_HEIGHT_PX = 12;  // CSS pixel line height for label lines
    const LABEL_TOP_EXTRA = 4;  // gap between boxes area and first label line

    const widthCSS  = 10 + arraySum(groupWLayout)  + (buckets.length - 1) * GROUP_X_GAP + 10;

    const tempCanvas = document.createElement('canvas');
    const tempCtxRaw = tempCanvas.getContext('2d');
    if (!tempCtxRaw) {throw new Error('Could not get temp canvas context');}
    const tempCtx = tempCtxRaw; // non-null
    tempCtx.font = `${(PREVIEW_FONT_PX * DPR).toString()}px sans-serif`;

    // Word wrap labels per bucket constrained to that bucket group's width.
    function wrapLabel(text: string, maxWidthCSS: number): string[] {
      const maxWidth = maxWidthCSS * DPR; // convert to canvas units
      const words = text.split(/\s+/);
      const lines: string[] = [];
      let current = '';
      for (const w of words) {
        const tentative = current ? current + ' ' + w : w;
        if (tempCtx.measureText(tentative).width <= maxWidth) {
          current = tentative;
        } else {
          if (!current) {
            // Single word longer than max width: hard-break
            let acc = '';
            for (const ch of w) {
              const t2 = acc + ch;
              if (tempCtx.measureText(t2).width <= maxWidth || acc.length === 0) {
                acc = t2;
              } else {
                lines.push(acc);
                acc = ch;
              }
            }
            if (acc) {lines.push(acc);}
            current = '';
          } else {
            lines.push(current);
            current = w;
          }
        }
      }
      if (current) {lines.push(current);}
      return lines;
    }

    const labelLinesPerBucket: string[][] = buckets.map((b, i) => (
      wrapLabel(b.label, Math.max(BOX, groupWLayout[i])))
    );
    const maxLabelLines = labelLinesPerBucket.reduce((m, ls) => Math.max(m, ls.length), 1);

    const heightCSS = arraySum(
      [TOP_PAD, tallestH, LABEL_PAD, maxLabelLines * LINE_HEIGHT_PX, LABEL_TOP_EXTRA]
    );

    let scale = 1;
    if (options.maxCanvasWidth !== undefined && widthCSS > options.maxCanvasWidth) {
      scale = options.maxCanvasWidth / widthCSS;
    }
    canvas.style.width  = (widthCSS * scale).toString() + 'px';
    canvas.style.height = (heightCSS * scale).toString() + 'px';
    canvas.width  = Math.floor(widthCSS * DPR);
    canvas.height = Math.floor(heightCSS * DPR);
    // If scaled, we rely on CSS scaling; drawing coordinates remain unscaled for crispness.

    let boxesInfo: { bucket: number, index: number, x: number, y: number, w: number, h: number }[];
    boxesInfo = [];
    const activeBox: { bucket: number, index: number } | null = null;
    const hoverBox: { bucket: number, index: number } | null = null;

    function draw(): void {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      boxesInfo = [];

      ctx.font = `${(PREVIEW_FONT_PX * DPR).toString()}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      let xStart = 10;
      for (let i = 0; i < buckets.length; i++) {
        const boxes = groupBoxes[i];
        const groupWpxRaw = groupWRaw[i];      // raw width required by boxes
        const groupWpxBoxes = groupWBoxes[i];  // width used for boxes after min bucket width
        const groupWpxLayout = groupWLayout[i];// full layout width (may be larger for label)
        const gyTopCSS = TOP_PAD; // all aligned at top

        // center raw boxes within boxes width within layout width
        const innerOffsetX = arraySum([
          (groupWpxLayout - groupWpxBoxes) / 2, (groupWpxBoxes - groupWpxRaw) / 2
        ]);

        for (let j = 0; j < boxes; j++) {
          const r = j % HEIGHT_BOXES;        // row index from top
          const c = Math.floor(j / HEIGHT_BOXES);
          const x = xStart + innerOffsetX + c * (BOX + GAP);
          const y = gyTopCSS + r * (BOX + GAP); // top-down!

          let color = '#ccc';
          if (activeBox?.bucket === i && activeBox.index === j) {
            color = '#000';
          } else if (hoverBox?.bucket === i && hoverBox.index === j) {
            color = '#888';
          }

          ctx.fillStyle = color;
          ctx.fillRect(x * DPR, y * DPR, BOX * DPR, BOX * DPR);

          boxesInfo.push({ bucket: i, index: j, x, y, w: BOX, h: BOX });
        }

        // Label (multi-line if needed)
        const lines = labelLinesPerBucket[i];
        const labelX = (xStart + groupWpxLayout / 2);
        const labelYcss = (TOP_PAD + tallestH + LABEL_TOP_EXTRA);
        ctx.fillStyle = '#333';
        for (let li = 0; li < lines.length; li++) {
          ctx.fillText(lines[li], labelX * DPR, (labelYcss + li * LINE_HEIGHT_PX) * DPR);
        }

        xStart += groupWpxLayout + GROUP_X_GAP;
      }
    }

    draw();


  } catch (error: unknown) {
    console.error('Error setting up buckets widget:', error);
    let msg = 'Unknown error';
    if (error instanceof Error) {
      console.error(error);
      // Print stack trace
      console.error(error.stack);
      msg = error.message;
    }
    addErrorMessage(box, `Error setting up buckets widget: ${msg}`);
  }

}
