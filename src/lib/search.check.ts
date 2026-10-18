// Self-check for lib/search.ts. Run: node src/lib/search.check.ts
import assert from 'node:assert/strict';
import { highlight, norm, search, wordMatch, type SearchItem } from './search.ts';

const item = (title: string, tech: string, desc = ''): SearchItem<string> => ({
  key: title,
  kind: 'post',
  title,
  subtitle: '',
  fields: [
    { text: title, weight: 3 },
    { text: tech, weight: 2 },
    { text: desc, weight: 1 },
  ],
  data: title,
});

const items = [
  item('GoCorp', 'React Node.js Express MongoDB', 'A cab management system'),
  item('Call Break', 'EJS Node.js Socket.IO', 'Multiplayer card game'),
  item('AI Career Mentor', 'LangChain LLM Python', 'Mock interviews'),
  item('Smart Attendance', 'ESP32 RFID', 'Offline attendance'),
];
const titles = (q: string) => search(items, q).map((r) => r.item.title);

assert.equal(norm('Node.js, React!'), 'node.js react');
assert.equal(norm('Café.'), 'cafe');
assert.equal(wordMatch('react', 'react'), 1);
assert.ok(wordMatch('reac', 'react') >= 0.9, 'prefix');
assert.ok(wordMatch('raect', 'react') > 0, 'typo');
assert.equal(wordMatch('go', 'mongodb'), 0, 'two letters only match from the start');

assert.deepEqual(titles('gocorp'), ['GoCorp']);
assert.ok(titles('raect').includes('GoCorp'), 'typo finds React project');
assert.ok(titles('nodejs').length === 2, '"nodejs" matches node.js');
assert.deepEqual(titles('ai'), ['AI Career Mentor'], '"ai" matches the title and synonyms');
assert.deepEqual(titles('iot'), ['Smart Attendance'], '"iot" synonym → ESP32/RFID');
assert.deepEqual(titles('react mongodb'), ['GoCorp'], 'every word must match');
assert.deepEqual(titles('react python'), [], 'no item has both');
assert.equal(titles('socket')[0], 'Call Break');
assert.deepEqual(titles('   '), []);

const hl = highlight('Built with React and MongoDB', 'raect');
assert.deepEqual(hl.filter((p) => p.hit).map((p) => p.text), ['React']);

console.log('search.check: all good');
