import { describe, expect, it } from 'vitest';
import {
  FRIEND_CODE_ALPHABET,
  FRIEND_CODE_LENGTH,
  MAX_FRIENDS,
  NICKNAME_MAX,
  checkNickname,
  formatFriendCode,
  generateFriendCode,
  normalizeFriendCode,
  planFriendReconcile,
  requestId,
  splitRequests,
  type FriendRequest,
} from '../src/core/friends';

describe('friend code', () => {
  it('uses 32 characters with no look-alikes (0/O, 1/I/l)', () => {
    expect(FRIEND_CODE_ALPHABET).toHaveLength(32);
    expect(new Set(FRIEND_CODE_ALPHABET).size).toBe(32);
    for (const c of '0O1Il') expect(FRIEND_CODE_ALPHABET.includes(c)).toBe(false);
  });
  it('generates 8 characters from the alphabet, deterministically for a given source', () => {
    let i = 0;
    const code = generateFriendCode(() => i++ % 32);
    expect(code).toHaveLength(FRIEND_CODE_LENGTH);
    expect(code).toBe('ABCDEFGH');
    expect(normalizeFriendCode(code)).toBe(code);
  });
  it('different random sources give different codes (sanity)', () => {
    const a = generateFriendCode((n) => Math.floor(Math.random() * n));
    const b = generateFriendCode((n) => Math.floor(Math.random() * n));
    expect(a).not.toBe(b);
  });
  it('normalizes pasted codes: spaces, hyphens, lower case, full-width', () => {
    expect(normalizeFriendCode('abcd-efgh')).toBe('ABCDEFGH');
    expect(normalizeFriendCode(' ABCD EFGH ')).toBe('ABCDEFGH');
    expect(normalizeFriendCode('ＡＢＣＤ－ＥＦＧＨ')).toBe('ABCDEFGH');
  });
  it('rejects wrong length and look-alike characters', () => {
    for (const bad of ['', 'ABCDEFG', 'ABCDEFGHJ', 'ABCD0FGH', 'ABCDOFGH', 'ABCD1FGH', 'ABCDIFGH', 'ABCD!FGH']) {
      expect(normalizeFriendCode(bad), bad).toBeNull();
    }
  });
  it('formats as 4-4', () => {
    expect(formatFriendCode('ABCDEFGH')).toBe('ABCD-EFGH');
    expect(formatFriendCode('ABC')).toBe('ABC');
  });
});

describe('checkNickname', () => {
  it('accepts normal names and trims/collapses spaces', () => {
    expect(checkNickname('  たろう   さん ')).toEqual({ ok: true, nickname: 'たろう さん' });
  });
  it(`counts characters (not UTF-16 units) up to ${NICKNAME_MAX}`, () => {
    expect(checkNickname('あ'.repeat(NICKNAME_MAX)).ok).toBe(true);
    expect(checkNickname('あ'.repeat(NICKNAME_MAX + 1)).ok).toBe(false);
    expect(checkNickname('😀'.repeat(NICKNAME_MAX)).ok).toBe(true);
    expect(checkNickname('😀'.repeat(NICKNAME_MAX + 1)).ok).toBe(false);
  });
  it('rejects empty, whitespace-only, control and direction-override characters', () => {
    for (const bad of ['', '   ', 'a\u0000b', 'a‮b', 'a​b']) {
      expect(checkNickname(bad).ok, JSON.stringify(bad)).toBe(false);
    }
  });
});

const req = (from: string, to: string, status: FriendRequest['status']): FriendRequest => ({
  id: requestId(from, to),
  fromUid: from,
  toUid: to,
  status,
  fromNickname: from,
});

describe('requests', () => {
  it('request ids are fixed per direction, so a duplicate cannot be created', () => {
    expect(requestId('a', 'b')).toBe('a_b');
    expect(requestId('b', 'a')).not.toBe(requestId('a', 'b'));
  });
  it('splits into incoming, outgoing and declined', () => {
    const all = [req('x', 'me', 'pending'), req('me', 'y', 'pending'), req('me', 'z', 'declined'), req('w', 'me', 'accepted')];
    const v = splitRequests('me', all);
    expect(v.incoming.map((r) => r.fromUid)).toEqual(['x']);
    expect(v.outgoing.map((r) => r.toUid)).toEqual(['y']);
    expect(v.declined.map((r) => r.toUid)).toEqual(['z']);
  });
});

describe('planFriendReconcile', () => {
  it('adds a person who accepted my request (sender side reflects the approval)', () => {
    const p = planFriendReconcile([], 'me', [req('me', 'b', 'accepted')], new Set());
    expect(p).toEqual({ add: ['b'], remove: [] });
  });
  it('adds a person whose request I accepted but whose add did not finish', () => {
    expect(planFriendReconcile([], 'me', [req('c', 'me', 'accepted')], new Set()).add).toEqual(['c']);
  });
  it('keeps a friend who is readable', () => {
    expect(planFriendReconcile(['d'], 'me', [], new Set(['d']))).toEqual({ add: [], remove: [] });
  });
  it('removes someone I can no longer read once no accepted request remains (they unfriended me)', () => {
    expect(planFriendReconcile(['e'], 'me', [], new Set())).toEqual({ add: [], remove: ['e'] });
  });
  it('does not remove a not-yet-readable friend while the accepted request still exists (approval in flight)', () => {
    expect(planFriendReconcile(['f'], 'me', [req('me', 'f', 'accepted')], new Set())).toEqual({ add: [], remove: [] });
  });
  it('does not add anyone past the friend limit', () => {
    const full = Array.from({ length: MAX_FRIENDS }, (_, i) => `u${i}`);
    expect(planFriendReconcile(full, 'me', [req('me', 'new', 'accepted')], new Set(full)).add).toEqual([]);
  });
  it('pending and declined requests never add anyone', () => {
    expect(planFriendReconcile([], 'me', [req('me', 'g', 'pending'), req('me', 'h', 'declined')], new Set()).add).toEqual([]);
  });
});
