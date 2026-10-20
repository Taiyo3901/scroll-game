import { describe, expect, it } from 'vitest';
import {
  ACTOR_CONTAINER_KEYS,
  ACTOR_HERO_JOBS,
  ACTOR_PALETTE,
  CONTAINER_SIZE,
  HERO_SIZE,
  containerFrameCount,
  containerFrameUri,
  containerFrames,
  heroFrames,
  heroSheet,
} from '../src/core/actors';
import { CATALOG } from '../src/data';

const checkFrames = (name: string, frames: string[][] | undefined, count: number, size: number) => {
  expect(frames, name).toBeDefined();
  expect(frames, name).toHaveLength(count);
  for (const rows of frames!) {
    expect(rows, name).toHaveLength(size);
    let filled = 0;
    for (const row of rows) {
      expect(row, name).toHaveLength(size);
      for (const c of row) {
        if (c === '.') continue;
        expect(ACTOR_PALETTE[c], `${name}: '${c}'`).toBeDefined();
        filled++;
      }
    }
    expect(filled, name).toBeGreaterThan(20);
  }
};

describe('container sprites', () => {
  it('every area has a pot, a chest (3 frames) and a mimic (2 frames); every room has a box (3 frames)', () => {
    for (const a of CATALOG.areas) {
      checkFrames(`pot:${a.id}`, containerFrames(`pot:${a.id}`), 3, CONTAINER_SIZE);
      checkFrames(`chest:${a.id}`, containerFrames(`chest:${a.id}`), 3, CONTAINER_SIZE);
      checkFrames(`mimic:${a.id}`, containerFrames(`mimic:${a.id}`), 2, CONTAINER_SIZE);
    }
    for (const g of CATALOG.genres) checkFrames(`box:${g.id}`, containerFrames(`box:${g.id}`), 3, CONTAINER_SIZE);
  });
  it('has no sprites for unknown skins', () => {
    const expected = CATALOG.areas.length * 3 + CATALOG.genres.length;
    expect(ACTOR_CONTAINER_KEYS).toHaveLength(expected);
    expect(containerFrameUri('chest:nope', 0)).toBeNull();
    expect(containerFrameCount('chest:cave')).toBe(3);
  });
  it('builds a data uri per frame', () => {
    expect(containerFrameUri('pot:cave', 2)).toMatch(/^data:image\/svg\+xml,/);
  });
});

describe('hero sprites', () => {
  it('there is one for every job and for the undiagnosed state, with all poses', () => {
    const jobs = new Set([...CATALOG.genres.map((g) => g.job), '勇者', 'default']);
    expect(new Set(ACTOR_HERO_JOBS)).toEqual(jobs);
    for (const j of jobs) {
      checkFrames(`${j}:walk`, heroFrames(j, 'walk'), 4, HERO_SIZE);
      checkFrames(`${j}:search`, heroFrames(j, 'search'), 2, HERO_SIZE);
      checkFrames(`${j}:idle`, heroFrames(j, 'idle'), 1, HERO_SIZE);
      checkFrames(`${j}:cheer`, heroFrames(j, 'cheer'), 1, HERO_SIZE);
    }
  });
  it('each job looks different from the others', () => {
    const looks = ACTOR_HERO_JOBS.map((j) => heroFrames(j, 'idle')!.flat().join('|'));
    expect(new Set(looks).size).toBe(looks.length);
  });
  it('an unknown job falls back to the default look; sheets are one frame wide per frame', () => {
    expect(heroSheet('???', 'walk').uri).toBe(heroSheet('default', 'walk').uri);
    expect(heroSheet('戦士', 'walk').frames).toBe(4);
    expect(heroSheet('戦士', 'search').frames).toBe(2);
    expect(heroSheet('戦士', 'idle').frames).toBe(1);
  });
});
