import { useEffect, useId } from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ZodType } from 'zod';
import { Button, Field, MoneyField, SelectField, TextAreaField } from '../ui';
import { toNullableId, toNullableText } from '../lib/forms';
import { useAllRecords } from '../features/shared/hooks';
import type { Entity } from '../lib/types';
import type { FormValues } from '../features/shared/schema';
import { ApiError } from '../lib/apiClient';
import { describeError } from '../lib/describeError';
export interface FieldSpec {
  component?: React.ComponentType;
  name: string;
  label: string;
  kind?: 'text' | 'email' | 'tel' | 'password' | 'number' | 'money' | 'select' | 'textarea' | 'date';
  optional?: boolean;
  autoComplete?: string;
  options?: { value: string | number; label: string }[];
  lookup?: { resource: string; id: string; label: string };
  hint?: string;
}
export interface FormSpec {
  schema: ZodType<FormValues>;
  defaults: FormValues;
  fields: FieldSpec[];
}
function LookupOptions({ resource, id, label }: { resource: string; id: string; label: string }) {
  const query = useAllRecords<Entity>(resource);
  return (
    <>
      {query.isError ? (
        <option disabled>Não foi possível carregar opções</option>
      ) : query.isPending ? (
        <option disabled>Carregando…</option>
      ) : (
        query.data
          .filter((x) => x.ativo !== false)
          .map((x) => (
            <option key={String(x[id])} value={String(x[id])}>
              {String(x[label])}
            </option>
          ))
      )}
    </>
  );
}
export function RecordForm({
  spec,
  initial,
  onSubmit,
  error,
  formId: supplied,
  children,
  submitLabel = 'Salvar',
}: {
  spec: FormSpec;
  initial?: FormValues;
  onSubmit: (values: FormValues) => Promise<void>;
  error?: unknown;
  formId?: string;
  children?: React.ReactNode;
  submitLabel?: string;
}) {
  const uid = useId();
  const formId = supplied || uid;
  const methods = useForm<FormValues>({
    resolver: zodResolver(spec.schema),
    mode: 'onBlur',
    defaultValues: initial || spec.defaults,
  });
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = methods;
  useEffect(() => {
    if (error instanceof ApiError && error.fieldErrors) {
      for (const [key, messages] of Object.entries(error.fieldErrors)) {
        const name = spec.fields.find((f) => f.name.toLowerCase() === key.toLowerCase())?.name;
        if (name) setError(name, { type: 'server', message: messages.join(' ') });
      }
    }
  }, [error, setError, spec.fields]);
  return (
    <FormProvider {...methods}>
      <form id={formId} className="form-grid" onSubmit={handleSubmit(onSubmit)} noValidate>
        {!!error && (
          <p role="alert" className="form-error">
            {describeError(error)}
          </p>
        )}
        {spec.fields.map((field) => {
          if (field.component) return <field.component key={field.name} />;
          const message = errors[field.name]?.message;
          const errorText = typeof message === 'string' ? message : undefined;
          const common = {
            label: field.label,
            error: errorText,
            required: !field.optional,
            'data-testid': 'field-' + field.name,
          };
          if (field.kind === 'money')
            return (
              <Controller
                key={field.name}
                name={field.name}
                control={control}
                render={({ field: input }) => (
                  <MoneyField
                    {...common}
                    name={input.name}
                    ref={input.ref}
                    value={typeof input.value === 'number' ? input.value : null}
                    onBlur={input.onBlur}
                    onChange={input.onChange}
                    nullable={field.optional}
                  />
                )}
              />
            );
          const props = register(field.name, {
            setValueAs:
              field.kind === 'number' || field.lookup
                ? field.optional
                  ? toNullableId
                  : (v: unknown) => (v === '' ? NaN : Number(v))
                : field.optional
                  ? toNullableText
                  : undefined,
          });
          if (field.kind === 'select' || field.lookup)
            return (
              <SelectField {...common} {...props} key={field.name} hint={field.hint}>
                <option value="">{field.optional ? 'Não informado' : 'Selecione'}</option>
                {field.lookup ? (
                  <LookupOptions {...field.lookup} />
                ) : (
                  field.options?.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))
                )}
              </SelectField>
            );
          if (field.kind === 'textarea')
            return <TextAreaField {...common} {...props} key={field.name} rows={3} />;
          return (
            <Field
              {...common}
              {...props}
              hint={field.hint}
              key={field.name}
              type={field.kind || 'text'}
              autoComplete={field.autoComplete}
              step={field.kind === 'number' ? 'any' : undefined}
              required={!field.optional}
            />
          );
        })}
        {children}
        {!supplied && (
          <Button data-testid="form-submit" type="submit" busy={isSubmitting}>
            {submitLabel}
          </Button>
        )}
      </form>
    </FormProvider>
  );
}
