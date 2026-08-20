/**
 * Applies the stored theme before first paint so the page never flashes light
 * before switching to dark.
 */
export function ThemeScript() {
  const script = `
    try {
      var stored = localStorage.getItem('theme');
      var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (stored === 'dark' || (!stored && prefersDark)) {
        document.documentElement.classList.add('dark');
      }
    } catch (e) {}
  `;
  return <script dangerouslySetInnerHTML={{ __html: script }} suppressHydrationWarning />;
}
