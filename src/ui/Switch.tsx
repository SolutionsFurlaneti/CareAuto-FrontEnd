import { forwardRef, useId, type ButtonHTMLAttributes } from 'react';

/** Chave liga/desliga acessível (role="switch"). O rótulo inteiro é clicável. */
export const Switch = forwardRef<
  HTMLButtonElement,
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> & {
    label: string;
    description?: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
  }
>(({ label, description, checked, onChange, disabled, id: supplied, ...props }, ref) => {
  const uid = useId();
  const id = supplied || uid;
  return (
    <div className={'switch-field' + (disabled ? ' disabled' : '')}>
      <button
        {...props}
        ref={ref}
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={description ? id + '-help' : undefined}
        disabled={disabled}
        className={'switch' + (checked ? ' on' : '')}
        onClick={() => onChange(!checked)}
      >
        <span className="switch-thumb" aria-hidden="true" />
      </button>
      <div>
        <label htmlFor={id}>{label}</label>
        {description && (
          <span id={id + '-help'} className="field-hint">
            {description}
          </span>
        )}
      </div>
    </div>
  );
});
Switch.displayName = 'Switch';
