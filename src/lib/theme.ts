// Theme preference: 'light', 'dark' or 'system' (follow the OS). Stored under the existing "darkMode"
// key as true / false / "system", which index.html also reads before the first paint.
export type ThemeMode = 'light' | 'dark' | 'system';

const osDark = () => matchMedia('(prefers-color-scheme: dark)').matches;

export function getThemeMode(): ThemeMode {
  try {
    const v = JSON.parse(localStorage.getItem('darkMode') ?? 'true');
    return v === 'system' ? 'system' : v === false ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

/** Applies a mode, saves it, and returns whether the page is now dark. */
export function setThemeMode(mode: ThemeMode): boolean {
  try {
    localStorage.setItem('darkMode', JSON.stringify(mode === 'system' ? 'system' : mode === 'dark'));
  } catch {
    /* not saved */
  }
  const dark = mode === 'system' ? osDark() : mode === 'dark';
  document.documentElement.classList.toggle('dark', dark);
  return dark;
}

/** Keeps "system" in step when the OS switches between light and dark while the page is open. */
export function followSystemTheme() {
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (getThemeMode() === 'system') document.documentElement.classList.toggle('dark', e.matches);
  });
}
