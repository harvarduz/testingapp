import React, { createContext, useContext, useLayoutEffect, useState } from 'react';
import { Check, Moon, Palette, Sun } from 'lucide-react';
import { Hct, MaterialDynamicColors, SchemeTonalSpot, argbFromHex, hexFromArgb } from '@material/material-color-utilities';

const storageKey = 'curio.appearance.v1';
export const appearancePalettes = [
  { name: 'Purple', seed: '#6750a4' },
  { name: 'Blue', seed: '#1a73e8' },
  { name: 'Green', seed: '#00856a' },
  { name: 'Terracotta', seed: '#ad4d25' },
];
const defaults = { mode: 'light', seed: appearancePalettes[0].seed };
const AppearanceContext = createContext(null);

function readAppearance() {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey));
    return { mode: value?.mode === 'dark' ? 'dark' : 'light', seed: appearancePalettes.some(palette => palette.seed === value?.seed) ? value.seed : defaults.seed };
  } catch { return defaults; }
}

function applyAppearance({ mode, seed }) {
  const scheme = new SchemeTonalSpot(Hct.fromInt(argbFromHex(seed)), mode === 'dark', 0);
  const colors = new MaterialDynamicColors();
  for (const color of colors.allColors) {
    document.documentElement.style.setProperty(`--md-sys-color-${color.name.replaceAll('_', '-')}`, hexFromArgb(color.getArgb(scheme)));
  }
  document.documentElement.dataset.theme = mode;
  document.documentElement.style.colorScheme = mode;
  const surface = document.documentElement.style.getPropertyValue('--md-sys-color-surface');
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', surface);
}

export function initializeAppearance() { applyAppearance(readAppearance()); }
export function useAppearance() { return useContext(AppearanceContext); }

export function AppearanceProvider({ children }) {
  const [appearance, setAppearance] = useState(readAppearance);
  const [storageError, setStorageError] = useState(false);
  useLayoutEffect(() => {
    applyAppearance(appearance);
    try { localStorage.setItem(storageKey, JSON.stringify(appearance)); setStorageError(false); }
    catch { setStorageError(true); }
  }, [appearance]);
  const toggleMode = () => setAppearance(value => ({ ...value, mode: value.mode === 'light' ? 'dark' : 'light' }));
  return <AppearanceContext.Provider value={{ appearance, setAppearance, toggleMode, storageError }}>{children}</AppearanceContext.Provider>;
}

export function AppearanceControls({ onOpen }) {
  const { appearance, toggleMode } = useAppearance();
  return <div className="appearance-controls"><button className="icon-button appearance-palette" onClick={onOpen} aria-label="Customize appearance"><Palette size={22} /></button><button className="icon-button appearance-mode" onClick={toggleMode} aria-label={appearance.mode === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}>{appearance.mode === 'light' ? <Moon size={22} /> : <Sun size={22} />}</button></div>;
}

export function AppearanceSettings() {
  const { appearance, setAppearance, storageError } = useAppearance();
  return <section className="appearance-settings" aria-labelledby="appearance-title"><span className="material-settings-icon"><Palette size={28} /></span><h2 id="appearance-title">Make Curio feel like you.</h2><p>Choose a colour. Your learning space will adapt around it.</p><fieldset><legend>Colour palette</legend><div className="palette-options">{appearancePalettes.map(palette => <button key={palette.seed} aria-pressed={appearance.seed === palette.seed} onClick={() => setAppearance(value => ({ ...value, seed: palette.seed }))}><span style={{ background: palette.seed }}>{appearance.seed === palette.seed && <Check size={22} />}</span>{palette.name}</button>)}</div></fieldset><fieldset><legend>Display mode</legend><div className="mode-options">{['light', 'dark'].map(mode => <button key={mode} aria-pressed={appearance.mode === mode} onClick={() => setAppearance(value => ({ ...value, mode }))}>{mode === 'light' ? <Sun size={20} /> : <Moon size={20} />}{mode === 'light' ? 'Light' : 'Dark'}{appearance.mode === mode && <Check size={17} />}</button>)}</div></fieldset><div className="palette-preview" aria-label="Palette preview"><span>Primary</span><span>Container</span><span>Secondary</span><span>Surface</span></div><p className="appearance-storage" role="status">{storageError ? 'This browser cannot remember appearance changes after a refresh.' : 'Your appearance is remembered on this browser.'}</p></section>;
}

export function MaterialComposition() {
  return <div className="material-composition" aria-hidden="true"><span className="composition-square">C</span><span className="composition-circle" /><span className="composition-arch" /></div>;
}
