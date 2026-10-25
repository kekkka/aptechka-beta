import type {ReactNode} from 'react';
import {Icon, type IconName} from '../components/Icon.tsx';

export function Head({title, subtitle, action}: {title: ReactNode; subtitle?: ReactNode; action?: ReactNode}) {
  return (
    <div className="page-head">
      <div className="between"><h1>{title}</h1>{action}</div>
      {subtitle && <p>{subtitle}</p>}
    </div>
  );
}

export function Loading({error, loading, onRetry}: {error: string; loading: boolean; onRetry: () => void}) {
  if (error) {
    return (
      <div className="hint orange space" role="alert">
        <Icon name="alert" /><span>{error} <button className="text-link" onClick={onRetry}>Повторить</button></span>
      </div>
    );
  }
  return loading ? <p className="caption" aria-live="polite">Загружаем…</p> : null;
}

export function Tile({icon, title, detail, onClick, tone = ''}: {icon: IconName; title: ReactNode; detail?: ReactNode; onClick?: () => void; tone?: '' | 'warn'}) {
  return (
    <button className={'quick-card' + (tone === 'warn' ? ' live-warn' : '')} onClick={onClick} disabled={!onClick}>
      <span className="quick-icon"><Icon name={icon} />{onClick && <span className="arrow"><Icon name="arrow" /></span>}</span>
      <strong>{title}</strong>
      {detail && <small>{detail}</small>}
    </button>
  );
}

export function Select({label, value, onChange, children}: {label: ReactNode; value: string; onChange: (v: string) => void; children: ReactNode}) {
  return <label className="field"><span>{label}</span><select value={value} onChange={e => onChange(e.target.value)}>{children}</select></label>;
}
