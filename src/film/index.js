// Assembles the film: timeline (story/timeline.json) + shot definitions.

import { Film } from '../engine/film.js';
import * as seq01 from './shots/seq01_boy_who_lived.js';
import * as seq02 from './shots/seq02_letters.js';
import * as seq03 from './shots/seq03_hagrid.js';
import * as seq04 from './shots/seq04_magical_world.js';
import * as seq05 from './shots/seq05_hogwarts.js';
import { lineupTimeline, lineupShots } from './lineup.js';

const modules = [seq01, seq02, seq03, seq04, seq05];

export async function createFilm(name = 'film') {
  if (name === 'lineup') return new Film(lineupTimeline, lineupShots);
  const timeline = await (await fetch('/story/timeline.json')).json();
  const shots = {};
  for (const m of modules) Object.assign(shots, m.shots);
  const missing = timeline.shots.filter((s) => !shots[s.id]).map((s) => s.id);
  if (missing.length) console.warn('shots not implemented yet:', missing.join(', '));
  return new Film(timeline, shots);
}
