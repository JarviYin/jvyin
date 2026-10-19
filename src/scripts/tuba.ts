const motionRoot = document.querySelector<HTMLElement>('[data-tuba-motion]');

if (motionRoot) {
  const root = motionRoot;
  const lines = [...root.querySelectorAll<HTMLElement>('[data-type-line]')];
  const words = [...root.querySelectorAll<HTMLElement>('[data-type-word]')];
  const fullWords = words.map(word => word.textContent || '');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  if (words.length && words.length === lines.length) {
    let timer: number | undefined;
    let line = 0;
    let character = 0;
    let holding = false;

    function stopTimer() {
      window.clearTimeout(timer);
      timer = undefined;
    }

    function showFullText() {
      words.forEach((word, index) => { word.textContent = fullWords[index]; });
      lines.forEach(item => { delete item.dataset.active; });
    }

    function reset() {
      line = 0;
      character = 0;
      holding = false;
      words.forEach(word => { word.textContent = ''; });
      lines.forEach(item => { delete item.dataset.active; });
      lines[0].dataset.active = '';
    }

    function schedule(delay: number) {
      stopTimer();
      timer = window.setTimeout(tick, delay);
    }

    function tick() {
      timer = undefined;
      if (reducedMotion.matches || document.hidden) return;
      if (holding) {
        reset();
        schedule(500);
        return;
      }
      lines.forEach((item, index) => { item.toggleAttribute('data-active', index === line); });
      character += 1;
      words[line].textContent = fullWords[line].slice(0, character);

      if (character === fullWords[line].length) {
        if (line < words.length - 1) {
          line += 1;
          character = 0;
          schedule(280);
        } else {
          holding = true;
          showFullText();
          schedule(6000);
        }
      } else {
        schedule(105);
      }
    }

    function syncMotion(restart = false) {
      stopTimer();
      if (restart && !reducedMotion.matches) reset();
      if (reducedMotion.matches) {
        root.dataset.motionState = 'paused';
        showFullText();
      } else if (document.hidden) {
        root.dataset.motionState = 'paused';
      } else {
        root.dataset.motionState = 'running';
        schedule(holding ? 6000 : 500);
      }
    }

    reducedMotion.addEventListener('change', () => syncMotion(!reducedMotion.matches));
    document.addEventListener('visibilitychange', () => syncMotion());
    window.addEventListener('pagehide', () => {
      stopTimer();
      root.dataset.motionState = 'paused';
    });
    window.addEventListener('pageshow', () => syncMotion());

    root.dataset.motionReady = '';
    syncMotion(true);
  }
}
