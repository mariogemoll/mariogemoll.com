export function el(parent: Document | Element, query: string): Element {
  const element = parent.querySelector(query);
  if (!element) {
    throw new Error(`Element for query ${query} not found`);
  }
  return element;
}

// function that maps from [0, 1] to range [a, b]
export function map01ToRange(range: [number, number], value: number): number {
  const [min, max] = range;
  return min + value * (max - min);
}

export async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = (): void => { resolve(img); };
    img.onerror = (error): void => {
      const errorMessage = error instanceof Error
        ? error.message
        : error instanceof Event
          ? 'Image load failed'
          : 'Unknown error';
      reject(new Error(`Failed to load image from ${src}: ${errorMessage}`));
    };
    img.src = src;
  });
}

export function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const f = (n: number, k = (n + h * 6) % 6): number =>
    v - v * s * Math.max(Math.min(k, 4 - k, 1), 0);
  return [f(5), f(3), f(1)];
}
