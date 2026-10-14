import React, { useId, useLayoutEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { api } from './api.js';

export default function Account({ onSession, initialMode = 'register' }) {
  const [mode, setMode] = useState(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const id = useId();
  const panel = useRef(null);
  const errorMessage = useRef(null);
  const submitting = useRef(false);
  const previousMode = useRef(mode);
  useLayoutEffect(() => {
    if (previousMode.current !== mode) panel.current.querySelector('[data-autofocus]')?.focus();
    previousMode.current = mode;
  }, [mode]);
  useLayoutEffect(() => { if (error) errorMessage.current?.focus(); }, [error]);
  const submit = async event => {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setError(''); setBusy(true);
    try {
      const session = await api(`/auth/${mode}`, { method: 'POST', body: { name, email, password } });
      onSession(session);
    } catch (error) { setError(error.message); }
    finally { submitting.current = false; setBusy(false); }
  };
  return <section className="account-panel" ref={panel} aria-labelledby={`${id}-title`}>
    <span className="account-icon"><LockKeyhole size={25} /></span>
    <span className="eyebrow">YOUR CURIO ACCOUNT</span>
    <h2 id={`${id}-title`}>{mode === 'register' ? 'Create your account.' : 'Welcome back.'}</h2>
    <p>{mode === 'register' ? 'Save your learning across devices and publish lessons of your own. One account for both.' : 'Sign in to your learning and creator workspace.'}</p>
    <form onSubmit={submit} aria-busy={busy}>
      <fieldset disabled={busy} className="account-form-fields">
      {mode === 'register' && <label>Your name<input autoComplete="name" data-autofocus value={name} onChange={e => { setName(e.target.value); setError(''); }} minLength={2} maxLength={32} required /></label>}
      <label>Email address<input type="email" autoComplete="email" data-autofocus={mode === 'login' ? true : undefined} value={email} onChange={e => { setEmail(e.target.value); setError(''); }} maxLength={254} required /></label>
      <label>Password<div className="password-field"><input aria-label="Password" type={showPassword ? 'text' : 'password'} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} value={password} onChange={e => { setPassword(e.target.value); setError(''); }} minLength={10} maxLength={128} required aria-describedby={`${id}-password-hint`} /><button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>
      <small id={`${id}-password-hint`}>At least 10 characters. Use a password unique to Curio.</small>
      </fieldset>
      {error && <p className="form-message error" role="alert" tabIndex={-1} ref={errorMessage}>{error}</p>}
      <button className="button primary full-width" disabled={busy}>{busy ? 'Just a moment…' : mode === 'register' ? 'Create free account' : 'Sign in'}<ArrowRight size={17} /></button>
    </form>
    <button className="account-switch" disabled={busy} onClick={() => { setMode(mode === 'register' ? 'login' : 'register'); setShowPassword(false); setError(''); }}>{mode === 'register' ? 'Already have an account? Sign in' : 'New here? Create an account'}</button>
    <span className="account-note"><Check size={14} />Learning is free. Publishing is free for a limited time.</span>
  </section>;
}
