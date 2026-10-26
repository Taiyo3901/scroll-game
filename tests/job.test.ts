import { describe, expect, it } from 'vitest';
import { ALL_ROUNDER, COMBO_SHARE, JOB_MIN_FINDS, JOB_SHARE, diagnoseJob, sumGenreFinds } from '../src/core/job';
import { COMBO_JOBS, comboJobName } from '../src/core/jobCombos';
import { emptyDay } from '../src/core/state';
import { CATALOG } from '../src/data';

const g = CATALOG.genres;

describe('diagnoseJob: single room', () => {
  it('needs a minimum number of finds', () => {
    expect(diagnoseJob({ video: JOB_MIN_FINDS - 1 }, g)).toBeNull();
    expect(diagnoseJob({}, g)).toBeNull();
  });
  it('picks the room job when one room has 40% or more and no second room reaches 30%', () => {
    const j = diagnoseJob({ video: 5, dev: 2, shop: 2, travel: 1 }, g)!;
    expect(j).toMatchObject({ name: '踊り子', genreId: 'video', genreId2: null, total: 10 });
  });
  it('the single-room boundary is inclusive at 40%', () => {
    expect(diagnoseJob({ study: 4, sns: 2, news: 2, shop: 2 }, g)!.name).toBe('賢者');
    expect(diagnoseJob({ study: 39, sns: 21, news: 20, shop: 20 }, g)!.name).toBe(ALL_ROUNDER);
  });
  it('becomes the all-rounder when nothing stands out', () => {
    const j = diagnoseJob({ video: 3, dev: 2, shop: 2, travel: 2, news: 1 }, g)!;
    expect(j).toMatchObject({ name: ALL_ROUNDER, genreId: null, genreId2: null });
  });
  it('the fallback room gives the wanderer job, and never joins a combination', () => {
    expect(diagnoseJob({ other: 8, dev: 2 }, g)!.name).toBe('放浪者');
    expect(diagnoseJob({ other: 5, dev: 5 }, g)!.name).not.toBe(ALL_ROUNDER);
    expect(diagnoseJob({ other: 5, dev: 5 }, g)!.genreId2).toBeNull();
    expect(diagnoseJob({ dev: 6, other: 4 }, g)!).toMatchObject({ name: '錬金術師', genreId2: null });
  });
  it('every room maps to a distinct job', () => {
    const jobs = g.map((x) => diagnoseJob({ [x.id]: 10 }, g)!.name);
    expect(new Set(jobs).size).toBe(g.length);
  });
});

describe('diagnoseJob: combinations', () => {
  it('two rooms with 30% each make a combination job, whichever order they were found in', () => {
    expect(diagnoseJob({ dev: 4, study: 3, sns: 1, news: 1, shop: 1 }, g)).toMatchObject({ name: '魔導技師', genreId: 'dev', genreId2: 'study' });
    expect(diagnoseJob({ study: 4, dev: 3, sns: 1, news: 1, shop: 1 }, g)).toMatchObject({ name: '魔導技師', genreId: 'study', genreId2: 'dev' });
    expect(diagnoseJob({ news: 5, travel: 4, video: 1 }, g)!.name).toBe('冒険記者');
  });
  it('a combination beats the single job even when the top room is 40% or more', () => {
    const j = diagnoseJob({ study: 5, dev: 3, sns: 2 }, g)!;
    expect(j.name).toBe('魔導技師');
    expect(5 / 10).toBeGreaterThanOrEqual(JOB_SHARE);
  });
  it('the second room needs to reach the combination share (inclusive)', () => {
    expect(diagnoseJob({ study: 7, dev: 3 }, g)!.name).toBe('魔導技師');
    expect(COMBO_SHARE).toBe(0.3);
    expect(diagnoseJob({ study: 7, dev: 2, sns: 1 }, g)!.name).toBe('賢者');
    expect(diagnoseJob({ study: 30, dev: 30, sns: 20, news: 20 }, g)!.name).toBe('魔導技師');
    expect(diagnoseJob({ study: 29, dev: 29, sns: 21, news: 21 }, g)!.name).toBe(ALL_ROUNDER);
  });
  it('ties between rooms are broken by the order of the rooms', () => {
    expect(diagnoseJob({ study: 5, dev: 5 }, g)).toMatchObject({ name: '魔導技師', genreId: 'study', genreId2: 'dev' });
  });
});

describe('combination job names', () => {
  const ids = g.map((x) => x.id).filter((id) => id !== 'other');
  it('has a name for every pair of rooms (45), all different from each other and from the room jobs', () => {
    const pairs: [string, string][] = [];
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) pairs.push([ids[i]!, ids[j]!]);
    expect(pairs).toHaveLength(45);
    const names = pairs.map(([a, b]) => comboJobName(a, b));
    expect(names.every((n) => typeof n === 'string' && n.length > 0)).toBe(true);
    const roomJobs = g.map((x) => x.job);
    expect(new Set(names).size).toBe(45);
    for (const n of names) expect([...roomJobs, ALL_ROUNDER]).not.toContain(n);
    expect(Object.keys(COMBO_JOBS)).toHaveLength(45);
  });
  it('uses the requested examples', () => {
    expect(comboJobName('study', 'dev')).toBe('魔導技師');
    expect(comboJobName('news', 'travel')).toBe('冒険記者');
    expect(comboJobName('dev', 'study')).toBeNull(); // 部屋の並び順で引く
  });
});

describe('sumGenreFinds', () => {
  it('adds room counts across days', () => {
    const a = { ...emptyDay(), genreFinds: { video: 2, dev: 1 } };
    const b = { ...emptyDay(), genreFinds: { video: 1 } };
    expect(sumGenreFinds([a, b])).toEqual({ video: 3, dev: 1 });
    expect(sumGenreFinds([])).toEqual({});
  });
});
