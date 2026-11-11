// Assembles the film: timeline (story/timeline.json) + shot definitions.

import { Film } from '../engine/film.js';
import * as seq05 from './shots/seq05_hogwarts.js';

const modules = [seq05];

export async function createFilm() {
  const timeline = await (await fetch('/story/timeline.json')).json();
  const shots = {};
  for (const m of modules) Object.assign(shots, m.shots);
  const missing = timeline.shots.filter((s) => !shots[s.id]).map((s) => s.id);
  if (missing.length) console.warn('shots not implemented yet:', missing.join(', '));
  return new Film(timeline, shots);
}
