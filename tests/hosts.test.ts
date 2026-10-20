import { describe, expect, it } from 'vitest';
import {
  MAX_DISABLED_HOSTS,
  addDisabledHost,
  isHostDisabled,
  isHostQuery,
  normalizeDisabledHosts,
  normalizeHost,
  removeDisabledHost,
} from '../src/core/hosts';

describe('normalizeHost', () => {
  it('extracts and lower-cases the host from a host name or URL', () => {
    expect(normalizeHost('example.com')).toBe('example.com');
    expect(normalizeHost('  WWW.Example.COM  ')).toBe('www.example.com');
    expect(normalizeHost('https://www.example.com:8080/path?q=1#x')).toBe('www.example.com');
    expect(normalizeHost('http://user:pw@example.com/')).toBe('example.com');
    expect(normalizeHost('example.com.')).toBe('example.com');
    expect(normalizeHost('*.example.com')).toBe('example.com');
    expect(normalizeHost('ＥＸＡＭＰＬＥ．ｃｏｍ')).toBe('example.com');
  });
  it('rejects things that are not host names', () => {
    for (const bad of ['', '   ', 'exa mple.com', 'a..b.com', '-bad.com', 'http://', 'exa_mple.com', 'ex<ample>.com', '.com.']) {
      expect(normalizeHost(bad), JSON.stringify(bad)).toBeNull();
    }
    expect(normalizeHost('a'.repeat(300) + '.com')).toBeNull();
  });
  it('accepts single-label hosts such as localhost (a local setup can be disabled too)', () => {
    expect(normalizeHost('localhost')).toBe('localhost');
    expect(normalizeHost('http://localhost:5173/')).toBe('localhost');
  });
});

describe('isHostDisabled', () => {
  const list = ['example.com', 'news.test'];
  it('matches the host itself and its subdomains, by whole labels', () => {
    expect(isHostDisabled('example.com', list)).toBe(true);
    expect(isHostDisabled('www.example.com', list)).toBe(true);
    expect(isHostDisabled('a.b.example.com', list)).toBe(true);
    expect(isHostDisabled('news.test', list)).toBe(true);
  });
  it('does not match look-alikes or parents', () => {
    expect(isHostDisabled('notexample.com', list)).toBe(false);
    expect(isHostDisabled('example.com.evil.test', list)).toBe(false);
    expect(isHostDisabled('com', list)).toBe(false);
    expect(isHostDisabled('test', list)).toBe(false);
  });
  it('is case-insensitive, ignores a trailing dot, and an empty host or list is never disabled', () => {
    expect(isHostDisabled('WWW.EXAMPLE.COM.', list)).toBe(true);
    expect(isHostDisabled('', list)).toBe(false);
    expect(isHostDisabled('example.com', [])).toBe(false);
  });
});

describe('the list helpers', () => {
  it('adds a normalized host, once', () => {
    const a = addDisabledHost([], 'https://www.Example.com/x');
    expect(a).toEqual({ ok: true, hosts: ['www.example.com'] });
    const again = addDisabledHost(['www.example.com'], 'WWW.EXAMPLE.COM');
    expect(again.ok).toBe(false);
  });
  it('rejects bad input with a reason, and respects the limit', () => {
    const bad = addDisabledHost([], 'not a host');
    expect(bad.ok).toBe(false);
    const full = Array.from({ length: MAX_DISABLED_HOSTS }, (_, i) => `h${i}.test`);
    expect(addDisabledHost(full, 'extra.test').ok).toBe(false);
  });
  it('removes a host', () => {
    expect(removeDisabledHost(['a.test', 'b.test'], 'a.test')).toEqual(['b.test']);
  });
  it('normalizes a stored list: drops bad, duplicate and non-string values; caps the size', () => {
    expect(normalizeDisabledHosts(['A.test', 'a.test', 7, '', 'bad host', 'b.test'])).toEqual(['a.test', 'b.test']);
    expect(normalizeDisabledHosts('x')).toEqual([]);
    expect(normalizeDisabledHosts(Array.from({ length: 500 }, (_, i) => `h${i}.test`))).toHaveLength(MAX_DISABLED_HOSTS);
  });
});

describe('isHostQuery', () => {
  it('only accepts the get-host message', () => {
    expect(isHostQuery({ type: 'get-host' })).toBe(true);
    for (const bad of [null, undefined, 'get-host', { type: 'scroll-batch' }, {}]) expect(isHostQuery(bad)).toBe(false);
  });
});
