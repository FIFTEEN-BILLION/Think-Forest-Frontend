import { useId, type InputHTMLAttributes } from 'react';
import { Icon } from './Icon';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'children'> & {
  label: string;
  description?: string;
  variant?: 'checkbox' | 'switch' | 'chip';
};

/** Native input semantics and form values, with the same control style on every screen. */
export function ChoiceControl({
  label,
  description,
  variant = 'checkbox',
  className = '',
  ...input
}: Props) {
  const id = useId();
  return (
    <label className={`choice-control choice-control--${variant} ${className}`}>
      <input
        {...input}
        type="checkbox"
        role={variant === 'switch' ? 'switch' : undefined}
        aria-labelledby={`${id}-label`}
        aria-describedby={description ? `${id}-description` : undefined}
      />
      <span className="choice-control-mark" aria-hidden="true">
        {variant !== 'switch' && <Icon name="check" />}
      </span>
      <span className="choice-control-copy">
        <span id={`${id}-label`}>{label}</span>
        {description && <small id={`${id}-description`}>{description}</small>}
      </span>
    </label>
  );
}
