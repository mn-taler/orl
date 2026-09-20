export function readStoredValue(key, legacyKey) {
  const current = localStorage.getItem(key);
  if (current != null) return current;
  return legacyKey ? localStorage.getItem(legacyKey) : null;
}

export function writeStoredValue(key, value, legacyKey) {
  localStorage.setItem(key, value);
  if (legacyKey) localStorage.removeItem(legacyKey);
}

export function removeStoredValue(key, legacyKey) {
  localStorage.removeItem(key);
  if (legacyKey) localStorage.removeItem(legacyKey);
}
