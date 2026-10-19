import { describe, expect, it } from 'vitest';
import { ALL_ROUNDER, JOB_MIN_FINDS, diagnoseJob, sumGenreFinds } from '../src/core/job';
import { emptyDay } from '../src/core/state';
import { CATALOG } from '../src/data';

const g = CATALOG.genres;

describe('diagnoseJob', () => {
  it('needs a minimum number of finds', () => {
    expect(diagnoseJob({ video: JOB_MIN_FINDS - 1 }, g)).toBeNull();
    expect(diagnoseJob({}, g)).toBeNull();
  });
  it('picks the room job when one room has 40% or more', () => {
    const j = diagnoseJob({ video: 4, dev: 3, shop: 3 }, g)!;
    expect(j).toMatchObject({ name: '踊り子', genreId: 'video', total: 10 });
  });
  it('the boundary is inclusive at 40%', () => {
    expect(diagnoseJob({ study: 4, sns: 3, news: 3 }, g)!.name).toBe('賢者');
    expect(diagnoseJob({ study: 39, sns: 31, news: 30 }, g)!.name).toBe(ALL_ROUNDER);
  });
  it('becomes the all-rounder when no room reaches 40%', () => {
    const j = diagnoseJob({ video: 3, dev: 3, shop: 2, travel: 2 }, g)!;
    expect(j).toMatchObject({ name: ALL_ROUNDER, genreId: null });
  });
  it('the fallback room gives the wanderer job', () => {
    expect(diagnoseJob({ other: 8, dev: 2 }, g)!.name).toBe('放浪者');
  });
  it('every room maps to a distinct job', () => {
    const jobs = g.map((x) => diagnoseJob({ [x.id]: 10 }, g)!.name);
    expect(new Set(jobs).size).toBe(g.length);
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
