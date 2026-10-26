import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { m, useReducedMotion } from 'motion/react';
interface Shared {
  label: string;
  error?: string;
  hint?: string;
}
export const Field = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & Shared>(
  ({ label, error, hint, id: supplied, ...props }, ref) => {
    const uid = useId();
    const reduced = useReducedMotion();
    const id = supplied || uid;
    return (
      <div className="field">
        <label htmlFor={id}>
          {label}
          {props.required && <span aria-hidden="true"> *</span>}
        </label>
        <input
          {...props}
          id={id}
          ref={ref}
          aria-invalid={!!error}
          aria-describedby={error || hint ? id + '-help' : undefined}
        />
        {(error || hint) && (
          <m.span
            key={error || hint}
            id={id + '-help'}
            className={error ? 'field-error' : 'field-hint'}
            role={error ? 'alert' : undefined}
            initial={error && !reduced ? { opacity: 1, x: 0 } : false}
            animate={
              error && !reduced ? { opacity: 1, x: [0, -3, 2, -1, 0] } : { opacity: 1, x: 0 }
            }
            transition={{ duration: reduced ? 0 : 0.16, ease: [0.2, 0, 0, 1] }}
          >
            {error || hint}
          </m.span>
        )}
      </div>
    );
  },
);
Field.displayName = 'Field';
export const SelectField = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & Shared
>(({ label, error, hint, id: supplied, children, ...props }, ref) => {
  const uid = useId();
  const reduced = useReducedMotion();
  const id = supplied || uid;
  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {props.required && <span aria-hidden="true"> *</span>}
      </label>
      <select
        {...props}
        ref={ref}
        id={id}
        aria-invalid={!!error}
        aria-describedby={error || hint ? id + '-help' : undefined}
      >
        {children}
      </select>
      {(error || hint) && (
        <m.span
          key={error || hint}
          id={id + '-help'}
          className={error ? 'field-error' : 'field-hint'}
          role={error ? 'alert' : undefined}
          initial={error && !reduced ? { opacity: 1, x: 0 } : false}
          animate={error && !reduced ? { opacity: 1, x: [0, -3, 2, -1, 0] } : { opacity: 1, x: 0 }}
          transition={{ duration: reduced ? 0 : 0.16, ease: [0.2, 0, 0, 1] }}
        >
          {error || hint}
        </m.span>
      )}
    </div>
  );
});
SelectField.displayName = 'SelectField';
export const TextAreaField = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & Shared
>(({ label, error, id: supplied, ...props }, ref) => {
  const uid = useId();
  const reduced = useReducedMotion();
  const id = supplied || uid;
  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {props.required && <span aria-hidden="true"> *</span>}
      </label>
      <textarea
        {...props}
        ref={ref}
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? id + '-help' : undefined}
      />
      {error && (
        <m.span
          key={error}
          id={id + '-help'}
          className="field-error"
          role="alert"
          initial={reduced ? false : { opacity: 1, x: 0 }}
          animate={reduced ? { opacity: 1 } : { opacity: 1, x: [0, -3, 2, -1, 0] }}
          transition={{ duration: reduced ? 0 : 0.16, ease: [0.2, 0, 0, 1] }}
        >
          {error}
        </m.span>
      )}
    </div>
  );
});
TextAreaField.displayName = 'TextAreaField';
