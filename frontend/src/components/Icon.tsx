// Inline SVG paths for the UI icon set (24×24, stroke styled in CSS).
const ICONS = {
  cross: "<path d=\"M9 3h6v6h6v6h-6v6H9v-6H3V9h6z\"/>",
  calendar: "<rect x=\"3\" y=\"5\" width=\"18\" height=\"16\" rx=\"3\"/><path d=\"M16 3v4M8 3v4M3 11h18m-13 5 2 2 5-5\"/>",
  clipboard: "<rect x=\"5\" y=\"4\" width=\"14\" height=\"18\" rx=\"2\"/><rect x=\"9\" y=\"2\" width=\"6\" height=\"4\" rx=\"1\"/><path d=\"M9 11h6m-6 4h6m-6 4h3\"/>",
  box: "<rect x=\"3\" y=\"7\" width=\"18\" height=\"14\" rx=\"2\"/><path d=\"M7 7V4h10v3M3 12h18m-11 4h4\"/>",
  bag: "<path d=\"M5 7h14l2 14H3L5 7Z\"/><path d=\"M8 8V6a4 4 0 0 1 8 0v2\"/>",
  users: "<circle cx=\"9\" cy=\"7\" r=\"3\"/><path d=\"M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6m2 5a5 5 0 0 1 3 5\"/>",
  leaf: "<path d=\"M20 3c-9-1-17 4-15 12 7 5 16-2 15-12Z\"/><path d=\"m3 21 12-13\"/>",
  arrow: "<path d=\"M4 12h16m-6-6 6 6-6 6\"/>",
  file: "<path d=\"M14 2H5v20h14V7l-5-5Zm0 0v6h5M8 12h8m-8 4h6\"/>",
  bell: "<path d=\"M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4\"/>",
  chevron: "<path d=\"m8 10 4 4 4-4\"/>",
  plus: "<path d=\"M12 5v14M5 12h14\"/>",
  check: "<path d=\"m5 12 4 4L19 6\"/>",
  clock: "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 7v5l3 2\"/>",
  pill: "<path d=\"m10 4-6 6a6 6 0 0 0 8 8l6-6a6 6 0 0 0-8-8Z\"/><path d=\"m7 7 10 10\"/>",
  sun: "<circle cx=\"12\" cy=\"12\" r=\"4\"/><path d=\"M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1\"/>",
  moon: "<path d=\"M20 14A8 8 0 0 1 10 4 8 8 0 1 0 20 14Z\"/>",
  cloud: "<path d=\"M6 18a4 4 0 0 1-1-8 6 6 0 0 1 11-3 5 5 0 0 1 2 11H6Z\"/>",
  more: "<circle cx=\"5\" cy=\"12\" r=\"1\"/><circle cx=\"12\" cy=\"12\" r=\"1\"/><circle cx=\"19\" cy=\"12\" r=\"1\"/>",
  shield: "<path d=\"m12 2 8 3v6c0 5-8 11-8 11S4 16 4 11V5l8-3Z\"/><path d=\"m8 11 3 3 5-5\"/>",
  info: "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 11v6m0-10v.2\"/>",
  close: "<path d=\"m6 6 12 12M6 18 18 6\"/>",
  upload: "<path d=\"M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5\"/>",
  search: "<circle cx=\"10\" cy=\"10\" r=\"6\"/><path d=\"m15 15 5 5\"/>",
  edit: "<path d=\"m15 3 6 6M3 21l5-1L21 7l-5-5L3 15v6Z\"/>",
  download: "<path d=\"M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4\"/>",
  heart: "<path d=\"M20 5c-3-3-6 0-8 2-2-2-5-5-8-2-4 4 3 10 8 15 5-5 12-11 8-15Z\"/>",
  undo: "<path d=\"M3 10h11a7 7 0 0 1 0 14M3 10l5-5m-5 5 5 5\"/>",
  trash: "<path d=\"M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7\"/>",
  stop: "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"m6 6 12 12\"/>",
  copy: "<rect x=\"8\" y=\"8\" width=\"13\" height=\"13\" rx=\"2\"/><path d=\"M16 8V3H3v13h5\"/>",
  home: "<path d=\"m3 10 9-7 9 7v11h-7v-7h-4v7H3V10Z\"/>",
  alert: "<path d=\"m12 3 10 18H2L12 3Z\"/><path d=\"M12 9v5m0 3v.2\"/>",
  phone: "<path d=\"m5 3 4 5-3 3c2 4 3 5 7 7l3-3 5 4c-1 4-4 4-7 3C6 18 2 12 2 6c0-2 1-3 3-3Z\"/>",
  watch: "<rect x=\"5\" y=\"6\" width=\"14\" height=\"12\" rx=\"4\"/><path d=\"m8 6 1-5h6l1 5M8 18l1 5h6l1-5m-5-9v3l2 1\"/>",
  speaker: "<rect x=\"5\" y=\"3\" width=\"14\" height=\"18\" rx=\"6\"/><ellipse cx=\"12\" cy=\"7\" rx=\"4\" ry=\"2\"/><path d=\"M9 15h6m-6 3h6\"/>",
  camera: "<rect x=\"3\" y=\"6\" width=\"18\" height=\"14\" rx=\"3\"/><path d=\"m8 6 2-3h4l2 3\"/><circle cx=\"12\" cy=\"13\" r=\"4\"/>",
  back: "<path d=\"m15 5-7 7 7 7\"/>",
  send: "<path d=\"m22 2-7 20-4-9-9-4 20-7ZM22 2 11 13\"/>",
  eye: "<path d=\"M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/>"
};

export type IconName = keyof typeof ICONS;

export function Icon({name}: {name: IconName}) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML={{__html: ICONS[name] || ICONS.pill}} />;
}
