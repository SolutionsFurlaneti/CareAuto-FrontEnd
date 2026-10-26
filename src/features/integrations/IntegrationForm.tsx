import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { RecordForm, type FormSpec } from '../../components/RecordForm';
import { useAuthStore, sessionScope } from '../../stores/authStore';
import type { FormValues } from '../shared/schema';
import type { IntegrationSlug } from './catalog';
import { useSaveIntegration } from './hooks';

export interface TabFormSpec {
  spec: FormSpec;
  /** Monta o corpo completo do PUT: campos desta aba sobre os valores salvos das demais. */
  toBody: (values: FormValues) => Record<string, unknown>;
}

/**
 * Formulário de uma única aba. Cada aba tem schema, erros e envio próprios:
 * salvar aqui nunca envia o que foi digitado em outra aba.
 */
export function IntegrationForm({
  slug,
  form,
  formKey,
  submitLabel,
  success,
  children,
}: {
  slug: IntegrationSlug;
  form: TabFormSpec;
  formKey: string;
  submitLabel: string;
  success: string;
  children?: ReactNode;
}) {
  const scope = useAuthStore((s) => sessionScope(s.session));
  const save = useSaveIntegration(slug);
  const [error, setError] = useState<unknown>();
  async function submit(values: FormValues) {
    setError(undefined);
    try {
      if (await save(form.toBody(values))) toast.success(success);
    } catch (e) {
      if (scope === sessionScope(useAuthStore.getState().session)) setError(e);
    }
  }
  return (
    <RecordForm
      key={formKey}
      spec={form.spec}
      onSubmit={submit}
      error={error}
      submitLabel={submitLabel}
    >
      {children}
    </RecordForm>
  );
}
