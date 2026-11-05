'use client';

/**
 * Contrôles partagés de CKlayser Studio : boutons d'outil, menus, champs
 * numériques glissables, vecteurs, couleurs, interrupteurs, sections.
 *
 * Toutes les icônes ont un nom accessible et une infobulle (attribut
 * data-tip, affiché par <StudioTooltip>).
 */
import { ChevronDown, ChevronRight, Check } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useDismiss } from '@/lib/hooks';
import styles from './ui.module.css';

/* -------------------------------------------------------------------------
   Bouton d'icône
   ------------------------------------------------------------------------- */

interface ToolButtonProps {
  label: string;
  icon: ReactNode;
  onClick?: () => void;
  shortcut?: string;
  /** Bouton bascule (aria-pressed). */
  pressed?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md';
  tone?: 'default' | 'accent' | 'record';
  className?: string;
  /** Texte visible à côté de l'icône. */
  text?: string;
}

export function ToolButton({ label, icon, onClick, shortcut, pressed, disabled, size = 'md', tone = 'default', className, text }: ToolButtonProps) {
  return (
    <button
      type="button"
      className={[styles.toolButton, styles[size], styles[tone], text ? styles.withText : '', className ?? ''].join(' ')}
      aria-label={text ? undefined : label}
      aria-pressed={pressed}
      aria-keyshortcuts={shortcut}
      data-tip={shortcut ? `${label} (${shortcut})` : label}
      disabled={disabled}
      onClick={onClick}
    >
      {icon}
      {text ? <span>{text}</span> : null}
    </button>
  );
}

/* -------------------------------------------------------------------------
   Menu déroulant
   ------------------------------------------------------------------------- */

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  shortcut?: string;
  onSelect?: () => void;
  disabled?: boolean;
  checked?: boolean;
  separator?: boolean;
  hint?: string;
}

interface MenuButtonProps {
  label: string;
  items: MenuItem[];
  /** Contenu du bouton (texte ou icône). */
  children: ReactNode;
  className?: string;
  /** Nom accessible si le bouton n'a qu'une icône. */
  ariaLabel?: string;
  align?: 'start' | 'end';
  tip?: string;
}

export function MenuButton({ label, items, children, className, ariaLabel, align = 'start', tip }: MenuButtonProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const id = useId();

  useDismiss(
    [buttonRef, menuRef],
    (reason) => {
      setOpen(false);
      if (reason === 'escape') buttonRef.current?.focus();
    },
    open,
  );

  useEffect(() => {
    if (open) menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled), [role="menuitemcheckbox"]:not(:disabled)')?.focus();
  }, [open]);

  const onKeyDown = (event: ReactKeyboardEvent) => {
    const entries = [...(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role^="menuitem"]:not(:disabled)') ?? [])];
    const index = entries.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      entries[(index + 1) % entries.length]?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      entries[(index - 1 + entries.length) % entries.length]?.focus();
    } else if (event.key === 'Home') {
      event.preventDefault();
      entries[0]?.focus();
    } else if (event.key === 'End') {
      event.preventDefault();
      entries[entries.length - 1]?.focus();
    } else if (event.key === 'Tab') {
      setOpen(false);
    }
  };

  return (
    <div className={styles.menuWrap} data-keys="local">
      <button
        ref={buttonRef}
        type="button"
        className={className ?? styles.menuTrigger}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-label={ariaLabel}
        data-tip={tip}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' && !open) {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        {children}
      </button>
      {open ? (
        <div ref={menuRef} id={id} role="menu" aria-label={label} className={`${styles.menu} ${align === 'end' ? styles.menuEnd : ''}`} onKeyDown={onKeyDown}>
          {items.map((item, index) =>
            item.separator ? (
              <div key={`sep-${index}`} role="separator" className={styles.menuSeparator} />
            ) : (
              <button
                key={`${item.label}-${index}`}
                type="button"
                role={item.checked === undefined ? 'menuitem' : 'menuitemcheckbox'}
                aria-checked={item.checked}
                className={styles.menuItem}
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false);
                  buttonRef.current?.focus();
                  item.onSelect?.();
                }}
              >
                <span className={styles.menuIcon} aria-hidden="true">
                  {item.checked !== undefined ? item.checked ? <Check size={14} strokeWidth={2.2} /> : null : item.icon}
                </span>
                <span className={styles.menuLabel}>
                  {item.label}
                  {item.hint ? <span className={styles.menuHint}>{item.hint}</span> : null}
                </span>
                {item.shortcut ? <kbd className={styles.kbd}>{item.shortcut}</kbd> : null}
              </button>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------
   Champ numérique (glisser l'étiquette pour faire varier la valeur)
   ------------------------------------------------------------------------- */

interface NumberFieldProps {
  label: string;
  /** Étiquette courte visible (X, Y, Z…) ; `label` reste le nom accessible. */
  short?: string;
  value: number;
  onChange: (value: number) => void;
  onGestureStart?: () => void;
  onGestureEnd?: () => void;
  step?: number;
  min?: number;
  max?: number;
  precision?: number;
  unit?: string;
  axis?: 'x' | 'y' | 'z';
  disabled?: boolean;
  state?: 'animated' | 'key' | 'override';
}

export function NumberField({
  label,
  short,
  value,
  onChange,
  onGestureStart,
  onGestureEnd,
  step = 0.1,
  min = -Infinity,
  max = Infinity,
  precision = 2,
  unit,
  axis,
  disabled,
  state,
}: NumberFieldProps) {
  const format = (number: number) => (Number.isFinite(number) ? Number(number.toFixed(precision)).toString() : '0');
  const [draft, setDraft] = useState<string | null>(null);
  const scrub = useRef<{ x: number; start: number; moved: boolean } | null>(null);
  const id = useId();
  const clamp = (number: number) => Math.min(max, Math.max(min, number));

  const commit = () => {
    if (draft === null) return;
    const parsed = Number(draft.replace(',', '.'));
    setDraft(null);
    if (Number.isFinite(parsed) && parsed !== value) onChange(clamp(parsed));
  };

  return (
    <div className={[styles.numberField, axis ? styles[`axis-${axis}`] : '', state ? styles[`state-${state}`] : ''].join(' ')}>
      <label
        htmlFor={id}
        className={styles.scrub}
        title={disabled ? undefined : 'Glisser pour modifier'}
        onPointerDown={(event) => {
          if (disabled || event.button !== 0) return;
          event.preventDefault();
          (event.target as HTMLElement).setPointerCapture(event.pointerId);
          scrub.current = { x: event.clientX, start: value, moved: false };
        }}
        onPointerMove={(event) => {
          const current = scrub.current;
          if (!current) return;
          const dx = event.clientX - current.x;
          if (!current.moved && Math.abs(dx) < 3) return;
          if (!current.moved) {
            current.moved = true;
            onGestureStart?.();
          }
          const factor = event.shiftKey ? 0.1 : event.altKey ? 10 : 1;
          const next = clamp(current.start + Math.round(dx / 3) * step * factor);
          onChange(Number(next.toFixed(precision)));
        }}
        onPointerUp={(event) => {
          const current = scrub.current;
          scrub.current = null;
          if ((event.target as HTMLElement).hasPointerCapture(event.pointerId)) (event.target as HTMLElement).releasePointerCapture(event.pointerId);
          if (current?.moved) onGestureEnd?.();
          else document.getElementById(id)?.focus();
        }}
      >
        <span aria-hidden="true">{short ?? label}</span>
        <span className="sr-only">{short ? label : ''}</span>
      </label>
      <input
        id={id}
        className={styles.numberInput}
        type="text"
        inputMode="decimal"
        disabled={disabled}
        value={draft ?? format(value)}
        aria-label={short ? label : undefined}
        onFocus={(event) => {
          setDraft(format(value));
          requestAnimationFrame(() => event.target.select());
        }}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            commit();
            (event.target as HTMLInputElement).blur();
          } else if (event.key === 'Escape') {
            setDraft(null);
            (event.target as HTMLInputElement).blur();
          } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            event.preventDefault();
            const delta = (event.key === 'ArrowUp' ? 1 : -1) * step * (event.shiftKey ? 10 : 1);
            const next = Number(clamp(value + delta).toFixed(precision));
            setDraft(format(next));
            onChange(next);
          }
        }}
      />
      {unit ? (
        <span className={styles.unit} aria-hidden="true">
          {unit}
        </span>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------
   Champs simples
   ------------------------------------------------------------------------- */

export function TextField({ label, value, onCommit, disabled }: { label: string; value: string; onCommit: (value: string) => void; disabled?: boolean }) {
  const [draft, setDraft] = useState<string | null>(null);
  const id = useId();
  return (
    <div className={styles.row}>
      <label htmlFor={id} className={styles.rowLabel}>
        {label}
      </label>
      <input
        id={id}
        className={styles.textInput}
        value={draft ?? value}
        disabled={disabled}
        maxLength={60}
        onFocus={() => setDraft(value)}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          if (draft !== null && draft.trim() && draft !== value) onCommit(draft);
          setDraft(null);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') (event.target as HTMLInputElement).blur();
          if (event.key === 'Escape') {
            setDraft(null);
            requestAnimationFrame(() => (event.target as HTMLInputElement).blur());
          }
        }}
      />
    </div>
  );
}

export function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const id = useId();
  return (
    <div className={styles.row}>
      <label htmlFor={id} className={styles.rowLabel}>
        {label}
      </label>
      <div className={styles.colorWrap}>
        <input id={id} type="color" className={styles.colorInput} value={value} onChange={(event) => onChange(event.target.value)} />
        <span className={styles.colorValue}>{value.toUpperCase()}</span>
      </div>
    </div>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; disabled?: boolean }[];
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className={styles.row}>
      <label htmlFor={id} className={styles.rowLabel}>
        {label}
      </label>
      <div className={styles.selectWrap}>
        <select id={id} className={styles.select} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value as T)}>
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown size={14} strokeWidth={2} aria-hidden="true" className={styles.selectChevron} />
      </div>
    </div>
  );
}

export function Toggle({ label, checked, onChange, hint, disabled }: { label: string; checked: boolean; onChange: (value: boolean) => void; hint?: string; disabled?: boolean }) {
  const id = useId();
  return (
    <div className={styles.toggleRow}>
      <label htmlFor={id} className={styles.toggleLabel}>
        {label}
        {hint ? <span className={styles.hint}>{hint}</span> : null}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        className={styles.switch}
        onClick={() => onChange(!checked)}
      >
        <span className={styles.switchThumb} aria-hidden="true" />
      </button>
    </div>
  );
}

/** Section repliable de l'inspecteur. */
export function Section({ title, children, defaultOpen = true, actions }: { title: string; children: ReactNode; defaultOpen?: boolean; actions?: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <button type="button" className={styles.sectionToggle} aria-expanded={open} aria-controls={id} onClick={() => setOpen((value) => !value)}>
          {open ? <ChevronDown size={14} strokeWidth={2} aria-hidden="true" /> : <ChevronRight size={14} strokeWidth={2} aria-hidden="true" />}
          <h3 className={styles.sectionTitle}>{title}</h3>
        </button>
        {actions ? <div className={styles.sectionActions}>{actions}</div> : null}
      </div>
      {open ? (
        <div id={id} className={styles.sectionBody}>
          {children}
        </div>
      ) : null}
    </section>
  );
}

export function Note({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'todo' }) {
  return <p className={`${styles.note} ${tone === 'todo' ? styles.noteTodo : ''}`}>{children}</p>;
}
