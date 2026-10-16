import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { ArrowRight, BookOpen, Check, CloudUpload, GraduationCap, LoaderCircle, LogIn, LogOut, Settings2, UserRound, UserRoundPlus } from 'lucide-react';
import './account-menu.css';
import ActionPending from './ActionPending.jsx';

export default function AccountMenu({ user, loading, signingOut, error, syncStatus, onOpen, onProfile, onLearning, onCreator, onAccount, onSignOut, onRetrySync }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({});
  const id = useId();
  const root = useRef(null);
  const trigger = useRef(null);
  const panel = useRef(null);
  const focusEdge = useRef('first');
  const syncError = Boolean(user && syncStatus && !syncStatus.startsWith('Saved') && !syncStatus.startsWith('Saving'));
  const initials = user?.name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();

  useLayoutEffect(() => {
    if (!open) return;
    const bounds = trigger.current.getBoundingClientRect();
    const width = Math.min(320, window.innerWidth - 24);
    const top = Math.min(bounds.bottom + 8, Math.max(12, window.innerHeight - 132));
    setPosition({ top, left: Math.max(12, Math.min(bounds.right - width, window.innerWidth - width - 12)), width, maxHeight: Math.max(0, window.innerHeight - top - 12) });
  }, [open]);

  useLayoutEffect(() => {
    if (!open || position.top === undefined) return;
    const controls = [...panel.current.querySelectorAll('button:not(:disabled)')];
    const action = focusEdge.current === 'last' ? controls.at(-1) : controls[0];
    action?.focus({ preventScroll: true });
    action?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
  }, [open, position]);

  useEffect(() => {
    if (!open) return;
    const outside = event => { if (!root.current.contains(event.target)) setOpen(false); };
    const escape = event => {
      if (event.key === 'Escape') { event.preventDefault(); setOpen(false); trigger.current.focus({ preventScroll: true }); }
    };
    const dismiss = () => setOpen(false);
    const bounds = trigger.current.getBoundingClientRect();
    const anchor = { top: bounds.top, left: bounds.left, x: window.scrollX, y: window.scrollY };
    const scroll = event => {
      if (panel.current?.contains(event.target)) return;
      const current = trigger.current.getBoundingClientRect();
      // A closed dialog can leave a queued scroll event after the page has
      // already settled. Dismiss only when the page or anchor actually moves.
      if (window.scrollX !== anchor.x || window.scrollY !== anchor.y || current.top !== anchor.top || current.left !== anchor.left) dismiss();
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('focusin', outside);
    document.addEventListener('keydown', escape);
    window.addEventListener('resize', dismiss);
    window.addEventListener('hashchange', dismiss);
    window.addEventListener('scroll', scroll, true);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('focusin', outside);
      document.removeEventListener('keydown', escape);
      window.removeEventListener('resize', dismiss);
      window.removeEventListener('hashchange', dismiss);
      window.removeEventListener('scroll', scroll, true);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (open) trigger.current.focus({ preventScroll: true });
    setOpen(false);
  }, [user?.id]);

  const choose = action => { setOpen(false); trigger.current.focus({ preventScroll: true }); action(); };
  const toggle = () => { focusEdge.current = 'first'; if (!open) onOpen?.(); setOpen(value => !value); };
  const keyboard = event => {
    const controls = [...panel.current.querySelectorAll('button:not(:disabled)')];
    const index = controls.indexOf(document.activeElement);
    let next;
    if (event.key === 'ArrowDown') next = (index + 1) % controls.length;
    else if (event.key === 'ArrowUp') next = (index - 1 + controls.length) % controls.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = controls.length - 1;
    if (next !== undefined) {
      event.preventDefault();
      controls[next]?.focus({ preventScroll: true });
      controls[next]?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
    }
  };

  return <div className="account-menu" ref={root}>
    <button className={`account-trigger ${user ? 'has-account' : ''}`} ref={trigger} aria-label="Open account menu" aria-expanded={open} aria-controls={open ? id : undefined} aria-busy={loading || signingOut} disabled={loading} title={loading ? 'Loading account' : user ? `${user.name} · Account` : 'Account'} onClick={toggle} onKeyDown={event => { if (!open && ['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); focusEdge.current = event.key === 'ArrowUp' ? 'last' : 'first'; onOpen?.(); setOpen(true); } }}>
      {loading || signingOut ? <LoaderCircle size={20} className="account-spinner" /> : user ? initials : <UserRound size={22} />}
      {(syncError || error) && <span className="account-attention" aria-hidden="true" />}
    </button>
    {open && <div className="account-popover" style={position} id={id} ref={panel} role="region" aria-label="Account menu" onKeyDown={keyboard}>
      <div className="account-identity"><span className="account-identity-avatar" aria-hidden="true">{user ? initials : <UserRound size={24} />}</span><div><strong>{user?.name || 'Guest learner'}</strong><p>{user?.email || 'Progress is saved in this browser.'}</p></div></div>
      {user && <p className={`account-sync ${syncError ? 'has-error' : ''}`} role="status">{syncError ? <CloudUpload size={16} /> : syncStatus?.startsWith('Saving') ? <LoaderCircle size={16} className="account-spinner" /> : <Check size={16} />}{syncStatus || 'Your learning syncs with this account.'}</p>}
      {error && <p className="account-menu-error" role="alert">{error}</p>}
      <div className="account-menu-actions">
        {!user && <><button onClick={() => choose(() => onAccount('login'))}><LogIn size={19} />Sign in<ArrowRight size={16} /></button><button onClick={() => choose(() => onAccount('register'))}><UserRoundPlus size={19} />Create account<ArrowRight size={16} /></button><div className="account-menu-divider" /></>}
        <button disabled={signingOut} onClick={() => choose(onLearning)}><BookOpen size={19} />My learning</button>
        <button disabled={signingOut} onClick={() => choose(onProfile)}><Settings2 size={19} />Learning profile</button>
        <button disabled={signingOut} onClick={() => choose(onCreator)}><GraduationCap size={19} />Creator workspace</button>
        {syncError && <button disabled={signingOut} onClick={onRetrySync}><CloudUpload size={19} />Retry saving progress</button>}
        {user && <><div className="account-menu-divider" /><button disabled={signingOut} aria-busy={signingOut || undefined} onClick={onSignOut}>{signingOut ? <ActionPending>Signing out…</ActionPending> : <><LogOut size={19} />Sign out</>}</button></>}
      </div>
    </div>}
  </div>;
}
