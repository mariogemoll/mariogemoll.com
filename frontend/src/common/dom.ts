
type HTMLElementGenerator<T> = (
  attrs: Record<string, string>, style?: Partial<CSSStyleDeclaration>
) => T;
type HTMLElementAdder<T> = (
  parent: HTMLElement, attrs: Record<string, string>, style?: Partial<CSSStyleDeclaration>
) => T;

export function el(parent: Document | Element, query: string): Element {
  const element = parent.querySelector(query);
  if (!element) {
    throw new Error(`Element for query ${query} not found`);
  }
  return element;
}

export function makeEl(
  tagName: string, attrs: Record<string, string>, style: Partial<CSSStyleDeclaration> = {}
): HTMLElement {
  const el = document.createElement(tagName);
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, value);
  }
  Object.assign(el.style, style);
  return el;
}

export function addEl(
  parent: HTMLElement,
  tagName: string,
  attrs: Record<string, string>,
  style: Partial<CSSStyleDeclaration> = {}
): HTMLElement {
  const el = makeEl(tagName, attrs, style);
  parent.appendChild(el);
  return el;
}

export const addDiv: HTMLElementAdder<HTMLDivElement> = (parent, attrs, style = {}) => (
  addEl(parent, 'div', attrs, style) as HTMLDivElement
);

export const addSpan: HTMLElementAdder<HTMLSpanElement> = (parent, attrs, style = {}) => (
  addEl(parent, 'span', attrs, style) as HTMLSpanElement
);

export const makeCanvas: HTMLElementGenerator<HTMLCanvasElement> = (attrs, style = {}) => (
  makeEl('canvas', attrs, style) as HTMLCanvasElement
);

export const addCanvas: HTMLElementAdder<HTMLCanvasElement> = (parent, attrs, style = {}) => (
  addEl(parent, 'canvas', attrs, style) as HTMLCanvasElement
);

export const addTable: HTMLElementAdder<HTMLTableElement> = (parent, attrs, style = {}) => (
  addEl(parent, 'table', attrs, style) as HTMLTableElement
);

export const addTd: HTMLElementAdder<HTMLTableCellElement> = (parent, attrs, style = {}) => (
  addEl(parent, 'td', attrs, style) as HTMLTableCellElement
);

export function addErrorMessage(el: HTMLElement, msg: string): HTMLParagraphElement {
  const p = document.createElement('p');
  p.textContent = msg;
  p.style.color = 'red';
  p.style.fontWeight = 'bold';
  el.appendChild(p);
  return p;
}

export function removePlaceholder(box: HTMLDivElement): void {
  const placeholder = box.querySelector('.placeholder');
  if (placeholder !== null) {
    placeholder.remove();
  }
}
