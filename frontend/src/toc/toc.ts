// SPDX-FileCopyrightText: 2026 Mario Gemoll
// SPDX-License-Identifier: 0BSD

const READING_LINE = 80;
const MODE_KEY = 'toc-mode';
const COLLAPSED_CLASS = 'toc-collapsed';

interface Section {
  heading: HTMLElement;
  item: Element;
}

/**
 * Index of the section the reader is currently in: the last heading at or above the reading line.
 * Before the first heading has scrolled past, the first section is considered active.
 */
export function activeHeadingIndex(tops: readonly number[], line: number): number {
  let active = 0;
  for (let i = 0; i < tops.length; i++) {
    if (tops[i] > line) {
      break;
    }
    active = i;
  }
  return active;
}

/**
 * Heading a table of contents link points at. Heading ids are percent-encoded (a heading like
 * "Learning "moons"" becomes `learning-%22moons%22`), so the raw fragment is what actually matches;
 * the decoded form is tried as a fallback.
 */
function findHeading(href: string): HTMLElement | null {
  const fragment = href.slice(1);
  return document.getElementById(fragment) ?? document.getElementById(
    decodeURIComponent(fragment)
  );
}

function collectSections(toc: HTMLElement): Section[] {
  const sections: Section[] = [];
  Array.from(toc.querySelectorAll('.toc-item')).forEach(item => {
    const href = item.querySelector('.toc-link')?.getAttribute('href');
    const heading = href === undefined || href === null ? null : findHeading(href);
    if (heading !== null) {
      sections.push({ heading, item });
    }
  });
  return sections;
}

function trackScrolling(sections: readonly Section[]): void {
  let scheduled = false;
  let current = -1;

  const update = (): void => {
    scheduled = false;
    const tops = sections.map(section => section.heading.getBoundingClientRect().top);
    const index = activeHeadingIndex(tops, READING_LINE);
    if (index === current) {
      return;
    }
    current = index;
    sections.forEach((section, i) => {
      section.item.classList.toggle('is-active', i === index);
    });
  };

  const schedule = (): void => {
    if (scheduled) {
      return;
    }
    scheduled = true;
    requestAnimationFrame(update);
  };

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  update();
}

function initToggle(toc: HTMLElement, toggle: HTMLButtonElement): void {
  const setOpen = (open: boolean): void => {
    toc.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  };

  toggle.addEventListener('click', () => {
    setOpen(!toc.classList.contains('is-open'));
  });

  document.addEventListener('click', event => {
    const target = event.target as Element;
    if (!toc.contains(target) || target.closest('.toc-link') !== null) {
      setOpen(false);
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      setOpen(false);
    }
  });
}

function initCollapse(button: HTMLButtonElement): void {
  const apply = (open: boolean): void => {
    document.documentElement.classList.toggle(COLLAPSED_CLASS, !open);
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', open ? 'Collapse contents' : 'Show contents');
  };

  apply(!document.documentElement.classList.contains(COLLAPSED_CLASS));

  button.addEventListener('click', () => {
    const open = document.documentElement.classList.contains(COLLAPSED_CLASS);
    apply(open);
    localStorage.setItem(MODE_KEY, open ? 'open' : 'collapsed');
  });
}

function init(): void {
  const toc = document.querySelector<HTMLElement>('.toc');
  if (toc === null) {
    return;
  }

  trackScrolling(collectSections(toc));

  const toggle = toc.querySelector<HTMLButtonElement>('.toc-toggle');
  if (toggle !== null) {
    initToggle(toc, toggle);
  }

  const collapse = toc.querySelector<HTMLButtonElement>('.toc-collapse');
  if (collapse !== null) {
    initCollapse(collapse);
  }
}

init();
