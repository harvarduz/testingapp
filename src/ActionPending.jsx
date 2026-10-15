import React from 'react';
import { LoaderCircle } from 'lucide-react';
import './action-pending.css';

export default function ActionPending({ children }) {
  return <span className="action-pending"><LoaderCircle size={17} aria-hidden="true" />{children}</span>;
}
