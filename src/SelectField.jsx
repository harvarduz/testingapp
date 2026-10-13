import React, { useId, useLayoutEffect, useRef, useState } from 'react';
import * as Select from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';

// A single labelled, keyboard-accessible selection control for filters and
// authoring. Radix owns typeahead, focus, scrolling and collision positioning.
export default function SelectField({ label, 'aria-label': ariaLabel, id, value, onChange, options, disabled = false, className = '', menuLabel, name }) {
  const generatedId = useId();
  const triggerId = id || generatedId;
  const trigger = useRef(null);
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState(null);
  const items = options.map(option => typeof option === 'object' ? { ...option, value: String(option.value) } : { value: String(option), label: String(option) });
  // Keep portalled options inside their modal's accessible/focus boundary.
  const container = trigger.current?.closest('[role="dialog"]') || undefined;

  useLayoutEffect(() => {
    if (!open || !content?.isConnected) return;
    // Radix hides the background from assistive technology. Inert also removes
    // its controls from the keyboard, preserving any existing modal boundary.
    const restored = [];
    for (let branch = content; branch && branch !== document.body; branch = branch.parentElement) {
      for (const sibling of branch.parentElement?.children || []) {
        if (sibling !== branch && !sibling.inert) {
          sibling.inert = true;
          restored.push(sibling);
        }
      }
    }
    return () => { restored.forEach(node => { node.inert = false; }); };
  }, [open, content]);

  return <div className={`select-field ${className}`}>
    {label && <label htmlFor={triggerId}>{label}</label>}
    <Select.Root value={String(value)} onValueChange={onChange} open={open} onOpenChange={setOpen} disabled={disabled} name={name}>
      <Select.Trigger ref={trigger} id={triggerId} className="select-trigger" aria-label={ariaLabel || label} data-value={String(value)}>
        <Select.Value placeholder="Choose an option" />
        <Select.Icon className="select-chevron"><ChevronDown size={20} aria-hidden="true" /></Select.Icon>
      </Select.Trigger>
      <Select.Portal container={container}>
        <Select.Content ref={setContent} className="select-menu" aria-label={menuLabel || label || ariaLabel} position="popper" sideOffset={8} collisionPadding={12} align="start" onEscapeKeyDown={event => { event.preventDefault(); setOpen(false); }}>
          <Select.ScrollUpButton className="select-scroll"><ChevronUp size={18} aria-hidden="true" /></Select.ScrollUpButton>
          <Select.Viewport className="select-viewport">
            <Select.Group>
              <Select.Label className="select-menu-label">{menuLabel || label || ariaLabel}</Select.Label>
              {items.map(option => <Select.Item key={option.value} value={option.value} disabled={option.disabled} className="select-option" data-value={option.value}>
                <Select.ItemIndicator className="select-check"><Check size={18} aria-hidden="true" /></Select.ItemIndicator>
                <Select.ItemText>{option.label}</Select.ItemText>
              </Select.Item>)}
            </Select.Group>
          </Select.Viewport>
          <Select.ScrollDownButton className="select-scroll"><ChevronDown size={18} aria-hidden="true" /></Select.ScrollDownButton>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  </div>;
}
