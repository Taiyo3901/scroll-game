import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CATALOG } from '../src/data';

const rules = readFileSync('firestore.rules', 'utf8');

describe('firestore.rules', () => {
  it('is up to date with the data and settings (run: node tools/make-rules.mjs)', () => {
    const fresh = execFileSync('node', ['tools/make-rules.mjs', '--stdout'], { encoding: 'utf8' });
    expect(rules.replace(/\r\n/g, '\n')).toBe(fresh.replace(/\r\n/g, '\n'));
  });

  it('allows exactly the item ids and room ids in the data', () => {
    for (const i of CATALOG.items) expect(rules, i.id).toContain(`'${i.id}'`);
    for (const g of CATALOG.genres) expect(rules, g.id).toContain(`'${g.id}'`);
    expect(rules).toContain(`c.size() <= ${CATALOG.items.length}`);
  });

  it('caps the weekly totals from the daily limit (300 finds/day, 10 points max)', () => {
    expect(rules).toContain('w.finds <= 2100');
    expect(rules).toContain('w.points <= 21000');
  });

  it('forbids listing users and friend codes, and has no blanket allow', () => {
    expect(rules).toMatch(/match \/users\/\{uid\}[\s\S]*allow list: if false/);
    expect(rules).toMatch(/match \/friendCodes\/\{code\}[\s\S]*allow list: if false/);
    expect(rules).not.toMatch(/allow (read|write)[^:]*:\s*if true/);
  });

  it('reads a profile only for the owner or a mutual friend', () => {
    expect(rules).toContain('request.auth.uid in resource.data.friendUids');
    expect(rules).toContain('uid in get(userPath(request.auth.uid)).data.friendUids');
  });

  it('adds a friend only when an accepted request exists, one at a time, and the friend code cannot change', () => {
    expect(rules).toContain('acceptedBetween(uid, after.removeAll(before)[0])');
    expect(rules).toContain('after.size() == before.size() + 1');
    expect(rules).toContain('request.resource.data.friendCode == resource.data.friendCode');
  });

  it('only the recipient can answer a request, and only the status can change', () => {
    expect(rules).toContain("affectedKeys().hasOnly(['status'])");
    expect(rules).toContain("request.resource.data.status in ['accepted', 'declined']");
    expect(rules).toContain("id == request.auth.uid + '_' + request.resource.data.toUid");
  });

  it('the friend code pattern matches the app alphabet (no 0/O/1/I)', () => {
    expect(rules).toContain('^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$');
  });

  it('the profile has only the agreed public fields (no URL, host or title field)', () => {
    const m = rules.match(/function validUser\(d\) \{\s*return d\.keys\(\)\.hasOnly\((\[[^\]]*\])\)/);
    expect(m).not.toBeNull();
    const fields = (m?.[1] ?? '').match(/'([^']+)'/g)?.map((x) => x.replace(/'/g, '')) ?? [];
    expect(fields.sort()).toEqual([
      'collection',
      'friendCode',
      'friendUids',
      'genreFinds',
      'nickname',
      'shared',
      'showcase',
      'updatedAt',
      'weekly',
    ]);
  });
});
