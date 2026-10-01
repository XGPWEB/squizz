/**
 * Word cloud layout. The font size of a word is proportional to the number of times it was given (a word
 * cited 6 times is 3 times as tall as one cited twice), with a floor so that single mentions stay readable.
 * Words are placed from the most to the least cited along a spiral from the centre, without overlap; when
 * they do not all fit, the whole cloud is scaled down and laid out again.
 *
 * Each word occupies the box of what is really drawn — accents above and descenders below included
 * (« à », « é », « q », « g ») — so that two neighbours never touch.
 */
export type CloudWord = { label: string; count: number };
export type PlacedWord = CloudWord & {
  /** Centre of the word's box, in the cloud's own units (0..width, 0..height). */
  x: number;
  y: number;
  /** Font size. */
  size: number;
  /** The box of the drawn word. */
  width: number;
  height: number;
  /** Where to draw: vertical position of the text's baseline (the text is centred on `x`). */
  baseline: number;
  color: string;
};

export const CLOUD = { width: 1000, height: 600, maxWords: 60, minSize: 18 };
/** Brand colours readable on the cream background. */
export const CLOUD_COLORS = ["#3445ff", "#ff6abb", "#ff8018", "#141413", "#7a4dd8"];

/**
 * What `text` occupies when set at `size` px: its width, and how far it rises above (`ascent`) and falls
 * below (`descent`) its baseline. Measured on a canvas in the browser, estimated in tests.
 */
export type Measure = (text: string, size: number) => { width: number; ascent: number; descent: number };

/** Size proportional to the count: the most cited word gets `top` px, the others their share of it. */
export function wordSize(count: number, maxCount: number, top: number, min = CLOUD.minSize) {
  return Math.max(min, Math.round((top * count) / Math.max(1, maxCount)));
}

function overlaps(a: PlacedWord, b: PlacedWord, gap: number) {
  return (
    Math.abs(a.x - b.x) * 2 < a.width + b.width + gap * 2 &&
    Math.abs(a.y - b.y) * 2 < a.height + b.height + gap * 2
  );
}

export function layoutCloud(words: CloudWord[], measure: Measure): PlacedWord[] {
  const list = [...words]
    .filter((w) => w.count > 0 && w.label.trim())
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "fr"))
    .slice(0, CLOUD.maxWords);
  if (!list.length) return [];
  const maxCount = list[0].count;
  const { width, height } = CLOUD;
  // Start big, then shrink until every word finds a place.
  for (let top = 170; top >= 26; top = Math.floor(top * 0.88)) {
    const min = Math.min(CLOUD.minSize, Math.max(11, Math.round(top / 6)));
    const placed: PlacedWord[] = [];
    let ok = true;
    for (const [i, w] of list.entries()) {
      const size = wordSize(w.count, maxCount, top, min);
      const box = measure(w.label, size);
      const word: PlacedWord = {
        ...w,
        size,
        width: box.width,
        height: box.ascent + box.descent,
        x: width / 2,
        y: height / 2,
        baseline: 0,
        color: CLOUD_COLORS[i % CLOUD_COLORS.length],
      };
      if (word.width > width - 20) {
        ok = false;
        break;
      }
      let found = false;
      // Archimedean spiral, flattened to the cloud's proportions.
      for (let t = 0; t < 2400; t++) {
        const angle = t * 0.25;
        const radius = 2.1 * angle;
        word.x = width / 2 + radius * Math.cos(angle) * (width / height);
        word.y = height / 2 + radius * Math.sin(angle);
        const inside =
          word.x - word.width / 2 >= 8 &&
          word.x + word.width / 2 <= width - 8 &&
          word.y - word.height / 2 >= 8 &&
          word.y + word.height / 2 <= height - 8;
        if (inside && !placed.some((p) => overlaps(word, p, 6))) {
          found = true;
          break;
        }
      }
      if (!found) {
        ok = false;
        break;
      }
      word.baseline = word.y - word.height / 2 + box.ascent;
      placed.push(word);
    }
    if (ok) return placed;
  }
  return [];
}
