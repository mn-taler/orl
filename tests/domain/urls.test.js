import { describe, expect, it } from 'vitest';
import { MAX_URL_LENGTH } from '../../src/config.js';
import { canonicalizeHttpUrl, isBlockedHostname } from '../../src/domain/urls.js';

describe('isBlockedHostname', () => {
  it('should block loopback, private, and local names', () => {
    expect(isBlockedHostname('localhost')).toBe(true);
    expect(isBlockedHostname('app.localhost')).toBe(true);
    expect(isBlockedHostname('printer.local')).toBe(true);
    expect(isBlockedHostname('127.0.0.1')).toBe(true);
    expect(isBlockedHostname('127.1')).toBe(true);
    expect(isBlockedHostname('10.0.0.4')).toBe(true);
    expect(isBlockedHostname('192.168.1.1')).toBe(true);
    expect(isBlockedHostname('172.16.5.1')).toBe(true);
    expect(isBlockedHostname('169.254.169.254')).toBe(true);
    expect(isBlockedHostname('::1')).toBe(true);
    expect(isBlockedHostname('::ffff:127.0.0.1')).toBe(true);
  });

  it('should allow public hostnames', () => {
    expect(isBlockedHostname('example.com')).toBe(false);
    expect(isBlockedHostname('github.com')).toBe(false);
    expect(isBlockedHostname('8.8.8.8')).toBe(false);
  });
});

describe('canonicalizeHttpUrl', () => {
  it('should accept http(s) and add https when the scheme is missing', () => {
    expect(canonicalizeHttpUrl('example.com', MAX_URL_LENGTH)).toBe('https://example.com/');
    expect(canonicalizeHttpUrl('https://a.example/path', MAX_URL_LENGTH)).toBe('https://a.example/path');
    expect(canonicalizeHttpUrl('http://a.example/x', MAX_URL_LENGTH)).toBe('http://a.example/x');
  });

  it('should reject non-http schemes, credentials, and blocked hosts', () => {
    expect(canonicalizeHttpUrl('javascript:alert(1)', MAX_URL_LENGTH)).toBe('');
    expect(canonicalizeHttpUrl('data:text/html,hi', MAX_URL_LENGTH)).toBe('');
    expect(canonicalizeHttpUrl('https://localhost/admin', MAX_URL_LENGTH)).toBe('');
    expect(canonicalizeHttpUrl('http://127.0.0.1:8080/', MAX_URL_LENGTH)).toBe('');
    expect(canonicalizeHttpUrl('https://user:pass@a.example/secret', MAX_URL_LENGTH)).toBe('https://a.example/secret');
  });

  it('should reject overlong URLs', () => {
    expect(canonicalizeHttpUrl(`https://a.example/${'x'.repeat(MAX_URL_LENGTH)}`, MAX_URL_LENGTH)).toBe('');
  });
});
