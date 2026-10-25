import {useEffect, useRef, type ReactNode} from 'react';
import {useApp} from '../AppContext.ts';
import {Icon} from './Icon.tsx';

const FOCUSABLE = 'button,a[href],input:not([type=hidden]),select,textarea,summary';

// Bottom sheet dialog. While mounted it makes the app inert, locks page scroll,
// closes on Escape and keeps Tab focus inside the sheet.
export function Sheet({title, subtitle, footer, children}: {title: ReactNode; subtitle?: ReactNode; footer?: ReactNode; children?: ReactNode}) {
  const {closeSheet} = useApp();
  const root = useRef<HTMLDivElement>(null), closeBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const app = document.getElementById('app')!;
    app.inert = true;
    document.body.style.overflow = 'hidden';
    const focusTimer = setTimeout(() => closeBtn.current?.focus(), 10);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeSheet();
        return;
      }
      if (e.key !== 'Tab' || !root.current) return;
      const els = [...root.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(x => !(x as HTMLButtonElement).disabled && x.offsetParent !== null), first = els[0], last = els.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKey);
      app.inert = false;
      document.body.style.overflow = '';
    };
  }, [closeSheet]);

  return (
    <div className="sheets" ref={root}>
      <section className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheetTitle">
        <div className="sheet-handle"></div>
        <div className="sheet-head">
          <div>
            <h2 id="sheetTitle">{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="close-btn" ref={closeBtn} onClick={closeSheet} aria-label="Закрыть"><Icon name="close" /></button>
        </div>
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </section>
    </div>
  );
}
