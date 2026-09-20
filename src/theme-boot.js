(function () {
  var stored = localStorage.getItem('orl.darkMode');
  if (stored == null) stored = localStorage.getItem('darkMode');
  var dark = stored === 'true' || (
    stored !== 'false' && (
      !window.matchMedia ||
      !window.matchMedia('(prefers-color-scheme: light)').matches
    )
  );
  document.documentElement.classList.toggle('dark', dark);
  var theme = document.querySelector('meta[name="theme-color"]');
  if (theme) theme.content = dark ? '#1a2c22' : '#e4f6e9';
})();
