// ui.js — Client-side interactions for Guitar Mode Finder

(function () {
  // Navigate to mode page from selector widgets
  function bindSelector() {
    const rootSelect = document.getElementById('rootSelect');
    const modeSelect = document.getElementById('modeSelect');
    const goBtn = document.getElementById('goBtn');

    if (!goBtn) return;

    function navigate() {
      const root = rootSelect.value;
      const mode = modeSelect.value.toLowerCase();
      const keySlug = root.toLowerCase().replace('#', '-sharp').replace('b', '-flat');
      window.location.href = `/modes/${mode}/${keySlug}/`;
    }

    goBtn.addEventListener('click', navigate);

    rootSelect.addEventListener('keydown', e => { if (e.key === 'Enter') navigate(); });
    modeSelect.addEventListener('keydown', e => { if (e.key === 'Enter') navigate(); });
  }

  document.addEventListener('DOMContentLoaded', () => {
    bindSelector();
  });
})();
