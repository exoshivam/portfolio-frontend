// Client-side search over everything on the site. All data is already in the feed, so results
// are instant. Matching is word-based with prefixes, common short names, and small typos.

export type ResultKind = 'post' | 'skill' | 'experience' | 'ongoing' | 'link';

export interface SearchField {
  text: string;
  weight: number; // how much a match here counts (title > tech > description)
}

export interface SearchItem<T = unknown> {
  key: string;
  kind: ResultKind;
  title: string;
  subtitle: string;
  fields: SearchField[];
  data: T;
}

export interface SearchResult<T = unknown> {
  item: SearchItem<T>;
  score: number;
}

/** Lowercase, strip accents, keep letters/digits and the symbols tech names use (c++, c#, node.js). */
export function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9+#.]+/g, ' ')
    .replace(/(^|\s)\.+|\.+(\s|$)/g, ' ') // dots only count inside words (node.js), not as punctuation
    .trim();
}

const compact = (w: string) => w.replace(/[.-]/g, '');

// Short names people type → what the portfolio actually says.
const SYNONYMS: Record<string, string[]> = {
  js: ['javascript'],
  ts: ['typescript'],
  node: ['node.js', 'nodejs'],
  nodejs: ['node.js'],
  py: ['python'],
  ai: ['llm', 'langchain', 'langgraph', 'openai', 'gpt', 'machine learning', 'rag'],
  ml: ['machine learning', 'llm'],
  llm: ['langchain', 'rag', 'ai'],
  db: ['database', 'mongodb', 'postgres', 'mysql', 'redis'],
  database: ['mongodb', 'postgres', 'mysql', 'redis'],
  mongo: ['mongodb'],
  iot: ['esp32', 'arduino', 'rfid', 'sensor'],
  golang: ['go'],
  k8s: ['kubernetes'],
  css: ['tailwind'],
  frontend: ['react', 'html', 'css', 'tailwind'],
  backend: ['node.js', 'express', 'go', 'fastapi', 'api'],
  realtime: ['socket.io', 'websocket'],
  websocket: ['socket.io'],
  game: ['call break', 'multiplayer'],
  job: ['experience', 'internship'],
  work: ['experience', 'internship'],
  cv: ['resume'],
};

/** Edit distance where swapping two neighbouring letters ("raect") counts as one edit. */
function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

/** How well one query word matches one text word: 1 exact, 0.9 prefix, 0.7 inside, 0.55 typo, 0 none. */
export function wordMatch(q: string, w: string): number {
  if (!q || !w) return 0;
  if (w === q || compact(w) === compact(q)) return 1;
  if (w.startsWith(q) || compact(w).startsWith(compact(q))) return 0.9;
  if (q.length >= 3 && w.includes(q)) return 0.7;
  if (q.length >= 4) {
    const max = q.length >= 7 ? 2 : 1;
    // Compare against the whole word and against its start, so "reac" ≈ "react" and "tpyescript" ≈ "typescript".
    if (editDistance(q, w, max) <= max || editDistance(q, w.slice(0, q.length), max) <= max) return 0.55;
  }
  return 0;
}

/** Best match of one query token (or its synonyms) in a text, 0 if none. */
function tokenInText(token: string, text: string): number {
  const words = text.split(' ');
  const alternatives: [string, number][] = [[token, 1], ...(SYNONYMS[token] ?? []).map((s): [string, number] => [norm(s), 0.85])];
  let best = 0;
  for (const [alt, factor] of alternatives) {
    if (alt.includes(' ')) {
      if (text.includes(alt)) best = Math.max(best, factor); // phrase synonym, e.g. "machine learning"
      continue;
    }
    for (const w of words) best = Math.max(best, wordMatch(alt, w) * factor);
  }
  return best;
}

/** Ranks items: every query word must match somewhere; title matches count most. */
export function search<T>(items: SearchItem<T>[], query: string): SearchResult<T>[] {
  const q = norm(query);
  const tokens = q.split(' ').filter(Boolean);
  if (!tokens.length) return [];
  const results: SearchResult<T>[] = [];
  for (const item of items) {
    const fields = item.fields.map((f) => ({ text: norm(f.text), weight: f.weight }));
    let score = 0;
    let all = true;
    for (const t of tokens) {
      let best = 0;
      for (const f of fields) best = Math.max(best, tokenInText(t, f.text) * f.weight);
      if (best === 0) {
        all = false;
        break;
      }
      score += best;
    }
    if (!all) continue;
    if (norm(item.title).startsWith(q)) score += 2;
    results.push({ item, score });
  }
  return results.sort((a, b) => b.score - a.score);
}

/** Splits text into parts, marking the words that match the query, for highlighting. */
export function highlight(text: string, query: string): { text: string; hit: boolean }[] {
  const tokens = norm(query).split(' ').filter(Boolean);
  if (!tokens.length) return [{ text, hit: false }];
  return text.split(/(\s+)/).map((part) => {
    const w = norm(part);
    const hit = !!w && w.split(' ').some((pw) => tokens.some((t) => tokenInText(t, pw) >= 0.55));
    return { text: part, hit };
  });
}
