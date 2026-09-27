import { beforeEach } from 'vitest';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  document.documentElement.classList.remove('dark');
  document.querySelectorAll('meta[name="theme-color"]').forEach((el) => el.remove());
});
