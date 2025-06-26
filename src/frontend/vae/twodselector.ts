export function setUp2dSelector(
  svg: SVGSVGElement, callback: (x: number, y: number) => void): void {
  const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  dot.setAttribute('r', '9');
  dot.setAttribute('fill', 'red'); // Dot color
  dot.setAttribute('cx', '0');
  dot.setAttribute('cy', '0');
  svg.appendChild(dot);
  const size = svg.viewBox.baseVal.width;
  let dragging = false;

  function setDot(x: number, y: number): void{
    const cx = Math.max(0, Math.min(size, x));
    const cy = Math.max(0, Math.min(size, y));
    dot.setAttribute('cx', cx.toString());
    dot.setAttribute('cy', cy.toString());
    callback(cx / size, 1 - cy / size);
  }

  function getMousePos(e: MouseEvent): { x: number, y: number } {
    const rect = svg.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  svg.addEventListener('mousedown', (e) => {
    dragging = true;
    const pos = getMousePos(e);
    setDot(pos.x, pos.y);
  });

  svg.addEventListener('mousemove', (e) => {
    if (!dragging) {return;}
    const pos = getMousePos(e);
    setDot(pos.x, pos.y);
  });

  window.addEventListener('mouseup', () => {
    dragging = false;
  });

  // Initial callback
  setDot(size / 2, size / 2);
}
