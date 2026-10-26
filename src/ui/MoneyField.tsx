import { forwardRef } from 'react';
import { Field } from './Field';
import { money } from '../lib/format';
interface Props {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  onBlur?: () => void;
  name?: string;
  error?: string;
  nullable?: boolean;
  disabled?: boolean;
  'data-testid'?: string;
}
export const MoneyField = forwardRef<HTMLInputElement, Props>(
  ({ value, onChange, nullable, ...props }, ref) => (
    <Field
      {...props}
      ref={ref}
      inputMode="numeric"
      value={value === null ? '' : money(value)}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, '');
        onChange(!digits && nullable ? null : Number(digits) / 100);
      }}
    />
  ),
);
MoneyField.displayName = 'MoneyField';
