const BLOCKED_HOSTS = new Set(['localhost', 'broadcasthost']);

function parseIPv4Loose(host) {
  const parts = String(host || '').split('.');
  if (parts.length < 1 || parts.length > 4) return null;
  if (!parts.every((part) => /^\d+$/.test(part))) return null;
  const nums = parts.map(Number);
  if (nums.some((value) => !Number.isInteger(value))) return null;
  if (parts.length === 1 && nums[0] <= 0xffffffff) {
    const value = nums[0];
    return [(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255];
  }
  if (parts.length === 2 && nums[0] <= 255 && nums[1] <= 0xffffff) {
    return [nums[0], (nums[1] >>> 16) & 255, (nums[1] >>> 8) & 255, nums[1] & 255];
  }
  if (parts.length === 3 && nums[0] <= 255 && nums[1] <= 255 && nums[2] <= 0xffff) {
    return [nums[0], nums[1], (nums[2] >>> 8) & 255, nums[2] & 255];
  }
  if (parts.length === 4 && nums.every((value) => value <= 255)) return nums;
  return null;
}

function isBlockedIPv4([a, b]) {
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  return false;
}

function expandIPv6(host) {
  const raw = String(host || '').toLowerCase();
  if (!raw.includes(':')) return null;
  if (raw.includes('::')) {
    const [head, tail, extra] = raw.split('::');
    if (extra !== undefined) return null;
    const headParts = head ? head.split(':') : [];
    const tailParts = tail ? tail.split(':') : [];
    const missing = 8 - headParts.length - tailParts.length;
    if (missing < 0) return null;
    const parts = [...headParts, ...Array(missing).fill('0'), ...tailParts];
    if (parts.length !== 8 || parts.some((part) => !/^[0-9a-f]{1,4}$/.test(part))) return null;
    return parts.map((part) => part.padStart(4, '0')).join(':');
  }
  const parts = raw.split(':');
  if (parts.length !== 8 || parts.some((part) => !/^[0-9a-f]{1,4}$/.test(part))) return null;
  return parts.map((part) => part.padStart(4, '0')).join(':');
}

function isBlockedIPv6(host) {
  const mapped = String(host || '').match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i);
  if (mapped) {
    const ipv4 = parseIPv4Loose(mapped[1]);
    return !ipv4 || isBlockedIPv4(ipv4);
  }
  const expanded = expandIPv6(host);
  if (!expanded) return true;
  if (expanded === '0000:0000:0000:0000:0000:0000:0000:0001') return true;
  if (expanded === '0000:0000:0000:0000:0000:0000:0000:0000') return true;
  if (expanded.startsWith('0000:0000:0000:0000:0000:ffff:')) {
    const hex = expanded.split(':').slice(6);
    const high = Number.parseInt(hex[0], 16);
    const low = Number.parseInt(hex[1], 16);
    return isBlockedIPv4([high >> 8, high & 255, low >> 8, low & 255]);
  }
  const first = Number.parseInt(expanded.slice(0, 4), 16);
  if ((first & 0xfe00) === 0xfc00) return true;
  if ((first & 0xffc0) === 0xfe80) return true;
  return false;
}

export function isBlockedHostname(host) {
  const hostname = String(host || '').trim().replace(/\.$/, '').toLowerCase();
  if (!hostname) return true;
  if (BLOCKED_HOSTS.has(hostname)) return true;
  if (hostname.endsWith('.localhost') || hostname.endsWith('.local')) return true;

  const ipv4 = parseIPv4Loose(hostname);
  if (ipv4) return isBlockedIPv4(ipv4);
  if (hostname.includes(':')) return isBlockedIPv6(hostname);
  return false;
}

export function canonicalizeHttpUrl(value, maxLength) {
  const raw = String(value || '').trim();
  if (!raw || raw.length > maxLength) return '';
  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  let parsed;
  try {
    parsed = new URL(candidate);
  } catch {
    return '';
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
  if (!parsed.hostname || isBlockedHostname(parsed.hostname)) return '';
  parsed.username = '';
  parsed.password = '';
  const href = parsed.href;
  return href.length > maxLength ? '' : href;
}
