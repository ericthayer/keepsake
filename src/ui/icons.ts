// 24×24 stroke icons drawn for this project. Decorative unless given a label.
import type { IconName } from '../core/types.ts';

type Shape =
  | readonly ['path', string]
  | readonly ['circle', number, number, number]
  | readonly ['rect', number, number, number, number, number];

const ICONS: Readonly<Record<IconName, readonly Shape[]>> = {
  estate: [
    ['path', 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z'],
    ['path', 'M14 3v5h5'],
    ['path', 'M9 13h6M9 17h4'],
  ],
  'life-insurance': [['path', 'M12 20s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 10c0 5.65-7 10-7 10z']],
  banking: [['path', 'M3 10l9-6 9 6'], ['path', 'M5.5 10v8M10 10v8M14 10v8M18.5 10v8'], ['path', 'M3 21h18']],
  investments: [['path', 'M3 3v18h18'], ['path', 'M7 15l4-4 3 3 6-6'], ['path', 'M16 8h4v4']],
  property: [['path', 'M3 11l9-7 9 7'], ['path', 'M5 9.5V20h14V9.5'], ['path', 'M10 20v-6h4v6']],
  insurance: [['path', 'M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6z']],
  debts: [['rect', 3, 5, 18, 14, 2], ['path', 'M3 10h18'], ['path', 'M7 15h4']],
  benefits: [['circle', 12, 9, 5], ['path', 'M8.6 12.7L7 21l5-3 5 3-1.6-8.3']],
  digital: [['circle', 12, 12, 9], ['path', 'M3 12h18'], ['path', 'M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z']],
  contacts: [
    ['circle', 9, 8, 3.5],
    ['path', 'M2.5 20a6.5 6.5 0 0 1 13 0'],
    ['path', 'M16 4.6a3.5 3.5 0 0 1 0 6.8'],
    ['path', 'M18 14.2a6.5 6.5 0 0 1 3.5 5.8'],
  ],
  household: [['circle', 8, 15, 4], ['path', 'M11 12l9-9'], ['path', 'M17 6l3 3M14.5 8.5l2 2']],
  overview: [['rect', 4, 4, 7, 7, 1], ['rect', 13, 4, 7, 7, 1], ['rect', 4, 13, 7, 7, 1], ['rect', 13, 13, 7, 7, 1]],
  guide: [
    ['path', 'M12 6.5C10 5 7 4.5 4 5v13.5c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5z'],
    ['path', 'M12 6.5V20'],
  ],
  settings: [['path', 'M4 7h9M17 7h3M4 17h3M11 17h9'], ['circle', 15, 7, 2], ['circle', 9, 17, 2]],
  lock: [['rect', 5, 11, 14, 10, 2], ['path', 'M8 11V7a4 4 0 0 1 8 0v4']],
  plus: [['path', 'M12 5v14M5 12h14']],
  edit: [['path', 'M4 20h4L19 9l-4-4L4 16z'], ['path', 'M13.5 6.5l4 4']],
  trash: [['path', 'M4 7h16'], ['path', 'M9 7V4h6v3'], ['path', 'M6 7l1 13h10l1-13']],
  download: [['path', 'M12 4v11'], ['path', 'M7 10l5 5 5-5'], ['path', 'M5 20h14']],
  upload: [['path', 'M12 15V4'], ['path', 'M7 9l5-5 5 5'], ['path', 'M5 20h14']],
  print: [['path', 'M7 9V3h10v6'], ['path', 'M7 17H4v-7a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v7h-3'], ['rect', 7, 14, 10, 7, 0]],
  external: [['path', 'M14 4h6v6'], ['path', 'M20 4l-9 9'], ['path', 'M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5']],
  check: [['path', 'M5 12.5l4.5 4.5L19 7']],
  alert: [['path', 'M12 4l9 16H3z'], ['path', 'M12 10v4'], ['path', 'M12 17.2v.1']],
  eye: [['path', 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z'], ['circle', 12, 12, 3]],
  'eye-off': [['path', 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z'], ['circle', 12, 12, 3], ['path', 'M4 4l16 16']],
  close: [['path', 'M6 6l12 12M18 6L6 18']],
};

const NS = 'http://www.w3.org/2000/svg';

function shape(spec: Shape): SVGElement {
  const el = document.createElementNS(NS, spec[0]);
  switch (spec[0]) {
    case 'path':
      el.setAttribute('d', spec[1]);
      break;
    case 'circle':
      el.setAttribute('cx', String(spec[1]));
      el.setAttribute('cy', String(spec[2]));
      el.setAttribute('r', String(spec[3]));
      break;
    case 'rect':
      el.setAttribute('x', String(spec[1]));
      el.setAttribute('y', String(spec[2]));
      el.setAttribute('width', String(spec[3]));
      el.setAttribute('height', String(spec[4]));
      el.setAttribute('rx', String(spec[5]));
      break;
  }
  return el;
}

export function icon(name: IconName, label?: string): SVGSVGElement {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', 'icon');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.75');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  if (label) {
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', label);
  } else {
    svg.setAttribute('aria-hidden', 'true');
  }
  for (const spec of ICONS[name]) svg.appendChild(shape(spec));
  return svg;
}
