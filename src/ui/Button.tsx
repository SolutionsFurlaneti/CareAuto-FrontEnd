import { forwardRef, type ReactNode } from 'react';
import { m, useReducedMotion, type HTMLMotionProps } from 'motion/react';

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  busy?: boolean;
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = 'primary', busy, children, className = '', disabled, type = 'button', ...props },
    ref,
  ) => {
    const reduced = useReducedMotion();
    return (
      <m.button
        type={type}
        {...props}
        ref={ref}
        disabled={disabled || busy}
        aria-busy={busy || undefined}
        whileTap={reduced || disabled || busy ? undefined : { scale: 0.98 }}
        transition={{ duration: 0.08 }}
        className={'button button-' + variant + ' ' + className}
      >
        {busy ? <span className="spinner" aria-hidden="true" /> : null}
        {children}
      </m.button>
    );
  },
);
Button.displayName = 'Button';
