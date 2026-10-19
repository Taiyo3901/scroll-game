import { describe, expect, it } from 'vitest';
import { classifyHost } from '../src/core/genre';
import { CATALOG } from '../src/data';

const c = (host: string) => classifyHost(host, CATALOG.genres);

describe('classifyHost', () => {
  it('matches exact domains and subdomains', () => {
    expect(c('youtube.com')).toBe('video');
    expect(c('www.youtube.com')).toBe('video');
    expect(c('m.youtube.com')).toBe('video');
    expect(c('github.com')).toBe('dev');
    expect(c('mail.google.com')).toBe('work');
    expect(c('store.steampowered.com')).toBe('game');
    expect(c('open.spotify.com')).toBe('music');
  });
  it('matches by whole labels only, not by trailing characters', () => {
    expect(c('notyoutube.com')).toBe('other');
    expect(c('youtube.com.evil.example')).toBe('other');
  });
  it('is case-insensitive and ignores a trailing dot', () => {
    expect(c('WWW.YouTube.COM.')).toBe('video');
  });
  it('treats universities (ac.jp) as the library', () => {
    expect(c('portal.chubu.ac.jp')).toBe('study');
  });
  it('sends unknown sites to the fallback room', () => {
    expect(c('example.org')).toBe('other');
    expect(c('')).toBe('other');
  });
  it('never classifies local, intranet or IP hosts', () => {
    for (const h of ['localhost', 'intranet', '192.168.0.1', '127.0.0.1', '[::1]', 'nas.local', 'wiki.internal', 'foo.corp']) {
      expect(c(h), h).toBe('other');
    }
  });
});
