import { useEffect } from 'react';

// Native buttons retain their activation, form and focus behaviour. Delegation
// also covers buttons rendered later by lessons, dialogs and the course editor.
export function useMaterialButtons() {
  useEffect(() => {
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const presses = new Map();
    const waves = new Set();
    const timers = new Set();

    const unavailable = button => !button?.isConnected || button.matches(':disabled') || button.getAttribute('aria-disabled') === 'true' || button.closest('[inert]');

    function release(id) {
      const press = presses.get(id);
      if (!press) return;
      presses.delete(id);
      if (![...presses.values()].some(value => value.button === press.button)) {
        press.button.removeAttribute('data-material-pressed');
      }
      if (press.wave) {
        press.wave.classList.add('material-ripple-released');
        const timer = setTimeout(() => {
          press.wave.remove();
          waves.delete(press.wave);
          timers.delete(timer);
        }, 350);
        timers.add(timer);
      }
    }

    function begin(button, id, point) {
      if (unavailable(button)) return;
      release(id);
      button.setAttribute('data-material-pressed', '');
      let wave;
      if (!reducedMotion.matches) {
        const bounds = button.getBoundingClientRect();
        const x = point ? Math.max(0, Math.min(point.x - bounds.left, bounds.width)) : bounds.width / 2;
        const y = point ? Math.max(0, Math.min(point.y - bounds.top, bounds.height)) : bounds.height / 2;
        const size = 2 * Math.hypot(Math.max(x, bounds.width - x), Math.max(y, bounds.height - y));
        wave = document.createElement('i');
        wave.className = 'material-ripple';
        wave.setAttribute('aria-hidden', 'true');
        Object.assign(wave.style, {
          width: `${size}px`, height: `${size}px`,
          left: `${x - size / 2}px`, top: `${y - size / 2}px`,
        });
        button.append(wave);
        waves.add(wave);
      }
      presses.set(id, { button, wave, point });
    }

    const buttonFor = event => event.target instanceof Element ? event.target.closest('button') : null;
    const pointerDown = event => {
      if (!event.isPrimary || event.button !== 0) return;
      begin(buttonFor(event), event.pointerId, { x: event.clientX, y: event.clientY });
    };
    const pointerUp = event => release(event.pointerId);
    const pointerMove = event => {
      const press = presses.get(event.pointerId);
      // A swipe scrolls the page rather than keeping a button's press state.
      if (press && event.pointerType === 'touch' && Math.hypot(event.clientX - press.point.x, event.clientY - press.point.y) > 10) release(event.pointerId);
    };
    const pointerOut = event => {
      const press = presses.get(event.pointerId);
      if (press && (!(event.relatedTarget instanceof Node) || !press.button.contains(event.relatedTarget))) release(event.pointerId);
    };
    const keyDown = event => {
      if (!event.repeat && (event.key === 'Enter' || event.key === ' ')) begin(buttonFor(event), 'keyboard');
    };
    const keyUp = event => { if (event.key === 'Enter' || event.key === ' ') release('keyboard'); };
    const focusOut = event => {
      if (presses.get('keyboard')?.button === event.target) release('keyboard');
    };
    const releaseAll = () => { for (const id of presses.keys()) release(id); };
    const visibilityChange = () => { if (document.hidden) releaseAll(); };
    // A fieldset can disable a descendant without setting button.disabled.
    // Also release feedback when a pending action removes its own trigger.
    const controlsChanged = new MutationObserver(() => {
      for (const [id, press] of presses) if (unavailable(press.button)) release(id);
    });
    controlsChanged.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['disabled', 'aria-disabled', 'inert'] });
    const bindings = [
      ['pointerdown', pointerDown], ['pointerup', pointerUp], ['pointercancel', pointerUp],
      ['pointermove', pointerMove], ['pointerout', pointerOut],
      ['keydown', keyDown], ['keyup', keyUp], ['focusout', focusOut],
    ];
    for (const [name, handler] of bindings) document.addEventListener(name, handler, { capture: true, passive: true });
    document.addEventListener('visibilitychange', visibilityChange);
    window.addEventListener('blur', releaseAll);
    return () => {
      controlsChanged.disconnect();
      for (const [name, handler] of bindings) document.removeEventListener(name, handler, true);
      document.removeEventListener('visibilitychange', visibilityChange);
      window.removeEventListener('blur', releaseAll);
      for (const press of presses.values()) press.button.removeAttribute('data-material-pressed');
      for (const timer of timers) clearTimeout(timer);
      for (const wave of waves) wave.remove();
    };
  }, []);
}
