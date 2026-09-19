import type { PropsWithChildren, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from './Icon';

export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <header className="page-head">
      <div className="eyebrow">{eyebrow}</div>
      <div className="row between wrap">
        <h1>{title}</h1>
        {children}
      </div>
      <p>{description}</p>
    </header>
  );
}
export function Notice({ children, variant = 'neutral' }: PropsWithChildren<{ variant?: string }>) {
  return (
    <div className={`notice ${variant}`}>
      <Icon name="info" />
      <div>{children}</div>
    </div>
  );
}
export function EmptyState({
  icon = 'book',
  title,
  description,
  to = '/adventures',
  action = '모험 만나기',
}: {
  icon?: string;
  title: string;
  description: string;
  to?: string;
  action?: string;
}) {
  return (
    <div className="panel empty">
      <Icon name={icon} />
      <h2>{title}</h2>
      <p>{description}</p>
      <Link className="btn" to={to}>
        {action}
        <Icon name="arrow" />
      </Link>
    </div>
  );
}
