import React from 'react';
import { FilePenLine, ArrowRight } from 'lucide-react';
import './navigation-confirm.css';

export default function NavigationConfirm({ onCancel, onDiscard }) {
  return <div className="navigation-confirm">
    <span className="navigation-confirm-icon"><FilePenLine size={26} /></span>
    <h2>Leave without saving?</h2>
    <p>Your changes haven’t been saved. Keep editing to finish your course, or discard these changes and continue.</p>
    <div className="navigation-confirm-actions">
      <button className="button outline" onClick={onCancel}>Keep editing</button>
      <button className="button primary" onClick={onDiscard}>Discard changes<ArrowRight size={17} /></button>
    </div>
  </div>;
}
