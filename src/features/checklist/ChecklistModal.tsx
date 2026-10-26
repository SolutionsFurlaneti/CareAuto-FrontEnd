import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button, Field, Modal, Skeleton, TextAreaField } from '../../ui';
import { QueryError } from '../../components/QueryError';
import { describeError } from '../../lib/describeError';
import { dateOnly, dateTime, todayIso } from '../../lib/format';
import type { Avaria, ChecklistEstadia, ChecklistInput, StatusItem, TipoAvaria } from './api';
import {
  MAX_DAMAGES,
  checklistItems,
  damageLabel,
  damageTypes,
  itemLabel,
  statusLabel,
  statusOptions,
  viewLabel,
} from './catalog';
import { DamageMap } from './DamageMap';
import { useChecklist, useSaveChecklist } from './hooks';

interface Draft {
  km: string;
  data: string;
  observacoes: string;
  itens: Record<string, StatusItem | undefined>;
  outro: string;
  avarias: Avaria[];
}
type Errors = Partial<Record<'km' | 'data' | 'observacoes' | 'outro', string>>;

function draftFrom(data: ChecklistEstadia): Draft {
  const saved = data.checkList;
  return {
    km: saved?.kmAtual == null ? '' : String(saved.kmAtual),
    data: saved?.dataUltimaManutencao ?? '',
    observacoes: saved?.observacoes ?? '',
    itens: Object.fromEntries((saved?.itens ?? []).map((x) => [x.item, x.status])),
    outro: saved?.itens.find((x) => x.item === 'OUTRO')?.descricao ?? '',
    avarias: saved?.avarias.map((x) => ({ ...x })) ?? [],
  };
}

function validate(draft: Draft): Errors {
  const errors: Errors = {};
  if (draft.km && !/^\d{1,7}$/.test(draft.km)) errors.km = 'Informe só números, até 9.999.999 km.';
  if (draft.data && draft.data > todayIso()) errors.data = 'A data não pode estar no futuro.';
  if (draft.data && draft.data < '1950-01-01') errors.data = 'Data inválida.';
  if (draft.observacoes.trim().length > 1000) errors.observacoes = 'Use até 1000 caracteres.';
  if (draft.itens.OUTRO && !draft.outro.trim()) errors.outro = 'Descreva o item avaliado.';
  if (draft.outro.trim().length > 100) errors.outro = 'Use até 100 caracteres.';
  return errors;
}

function toInput(draft: Draft, versao: string | null): ChecklistInput {
  return {
    kmAtual: draft.km ? Number(draft.km) : null,
    dataUltimaManutencao: draft.data || null,
    observacoes: draft.observacoes.trim() || null,
    itens: checklistItems
      .filter(({ item }) => draft.itens[item])
      .map(({ item }) => ({
        item,
        status: draft.itens[item]!,
        descricao: item === 'OUTRO' ? draft.outro.trim() : null,
      })),
    avarias: draft.avarias.map((x) => ({ ...x, observacao: x.observacao?.trim() || null })),
    versao,
  };
}

/** Checklist veicular da estadia: preenchido a qualquer momento enquanto a estadia está aberta. */
export function ChecklistModal({ estadiaId, onClose }: { estadiaId: number; onClose: () => void }) {
  const query = useChecklist(estadiaId);
  const save = useSaveChecklist(estadiaId);
  const data = query.data;
  const [editing, setEditing] = useState<boolean>();
  const [draft, setDraft] = useState<Draft>();
  const [dirty, setDirty] = useState(false);
  const [tool, setTool] = useState<TipoAvaria>('A');
  const [selected, setSelected] = useState<number | null>(null);
  const [errors, setErrors] = useState<Errors>({});

  // Sem checklist salvo, abre direto no formulário; com checklist, abre o relatório.
  useEffect(() => {
    if (data && editing === undefined) setEditing(!data.checkList && data.editavel);
  }, [data, editing]);
  useEffect(() => {
    if (data && editing && !draft) setDraft(draftFrom(data));
  }, [data, editing, draft]);

  const change = (patch: Partial<Draft>) => {
    setDraft((current) => (current ? { ...current, ...patch } : current));
    setDirty(true);
  };
  // Confirmação inline (sem SweetAlert sobre o Dialog), como no restante do app.
  const [discarding, setDiscarding] = useState<'close' | 'cancel' | null>(null);
  const perform = (target: 'close' | 'cancel') => {
    setDiscarding(null);
    if (target === 'close' || !data?.checkList) return onClose();
    setDraft(undefined);
    setDirty(false);
    setErrors({});
    setSelected(null);
    setEditing(false);
  };
  const leave = (target: 'close' | 'cancel') => {
    if (save.isPending) return;
    if (editing && dirty) setDiscarding(target);
    else perform(target);
  };
  const submit = async () => {
    if (!draft || !data) return;
    const found = validate(draft);
    setErrors(found);
    if (Object.keys(found).length) return;
    const result = await save
      .mutateAsync(toInput(draft, data.checkList?.versao ?? null))
      .catch(() => undefined);
    if (!result) return;
    setDirty(false);
    setDraft(undefined);
    setSelected(null);
    setEditing(false);
  };

  const title = 'Checklist veicular' + (data ? ' · ' + data.placa : '');
  const actions = discarding ? (
    <>
      <span className="modal-actions-note" role="alert">
        As alterações não salvas serão perdidas.
      </span>
      <Button variant="secondary" data-testid="checklist-keep" onClick={() => setDiscarding(null)}>
        Continuar editando
      </Button>
      <Button variant="danger" data-testid="checklist-discard" onClick={() => perform(discarding)}>
        Descartar alterações
      </Button>
    </>
  ) : data && editing ? (
    <>
      <Button
        variant="secondary"
        data-testid="checklist-cancel"
        disabled={save.isPending}
        onClick={() => leave('cancel')}
      >
        {data.checkList ? 'Cancelar edição' : 'Fechar'}
      </Button>
      <Button data-testid="checklist-save" busy={save.isPending} onClick={() => void submit()}>
        Salvar checklist
      </Button>
    </>
  ) : (
    <>
      <Button variant="secondary" data-testid="checklist-close" onClick={() => leave('close')}>
        Fechar
      </Button>
      {data?.editavel && data.checkList && (
        <Button data-testid="checklist-edit" onClick={() => setEditing(true)}>
          Editar checklist
        </Button>
      )}
    </>
  );

  return (
    <Modal
      open
      size="lg"
      title={title}
      onClose={() => leave('close')}
      busy={save.isPending}
      actions={actions}
    >
      {query.isPending ? (
        <Skeleton />
      ) : query.isError ? (
        <QueryError error={query.error} what="o checklist" onRetry={() => void query.refetch()} />
      ) : (
        <div className="checklist" data-testid="checklist">
          <Header data={data!} />
          {editing && draft ? (
            <Form
              draft={draft}
              errors={errors}
              change={change}
              tool={tool}
              setTool={setTool}
              selected={selected}
              setSelected={setSelected}
            />
          ) : (
            <Report data={data!} />
          )}
          {save.error && (
            <p className="field-error" role="alert" data-testid="checklist-error">
              {describeError(save.error)}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}

function Header({ data }: { data: ChecklistEstadia }) {
  const vehicle = [data.marca, data.modelo].filter(Boolean).join(' ') || '—';
  return (
    <dl className="detail-grid checklist-header" data-testid="checklist-header">
      <div>
        <dt>Placa</dt>
        <dd className="plate">{data.placa}</dd>
      </div>
      <div>
        <dt>Marca / modelo</dt>
        <dd>
          {vehicle}
          {data.cor ? ' · ' + data.cor : ''}
        </dd>
      </div>
      <div>
        <dt>Cliente</dt>
        <dd>{data.clienteNome ?? 'Não informado'}</dd>
      </div>
      <div>
        <dt>Telefone</dt>
        <dd>{data.clienteTelefone ?? '—'}</dd>
      </div>
      <div>
        <dt>Entrada</dt>
        <dd>{dateTime(data.dataEntrada)}</dd>
      </div>
    </dl>
  );
}

function Form({
  draft,
  errors,
  change,
  tool,
  setTool,
  selected,
  setSelected,
}: {
  draft: Draft;
  errors: Errors;
  change: (patch: Partial<Draft>) => void;
  tool: TipoAvaria;
  setTool: (tool: TipoAvaria) => void;
  selected: number | null;
  setSelected: (index: number | null) => void;
}) {
  const full = draft.avarias.length >= MAX_DAMAGES;
  const updateDamage = (index: number, patch: Partial<Avaria>) =>
    change({ avarias: draft.avarias.map((x, i) => (i === index ? { ...x, ...patch } : x)) });
  return (
    <>
      <div className="form-grid checklist-fields">
        <Field
          label="Km atual"
          inputMode="numeric"
          data-testid="checklist-km"
          value={draft.km}
          error={errors.km}
          onChange={(e) => change({ km: e.target.value.replace(/\D/g, '').slice(0, 7) })}
        />
        <Field
          label="Última manutenção"
          type="date"
          max={todayIso()}
          data-testid="checklist-last-maintenance"
          value={draft.data}
          error={errors.data}
          onChange={(e) => change({ data: e.target.value })}
        />
      </div>

      <div className="section-label">
        <h3>Itens verificados</h3>
        <small className="muted">Toque novamente para limpar a escolha.</small>
      </div>
      <div className="checklist-items" data-testid="checklist-items">
        {checklistItems.map(({ item, label }) => (
          <div className="checklist-item" key={item}>
            <span id={'item-' + item}>{label}</span>
            <div className="choice-group" role="radiogroup" aria-labelledby={'item-' + item}>
              {statusOptions.map((option) => {
                const active = draft.itens[item] === option.value;
                return (
                  <button
                    type="button"
                    key={option.value}
                    role="radio"
                    aria-checked={active}
                    className={
                      'choice choice-' + option.value.toLowerCase() + (active ? ' active' : '')
                    }
                    data-testid={`item-${item}-${option.value}`}
                    onClick={() =>
                      change({
                        itens: { ...draft.itens, [item]: active ? undefined : option.value },
                      })
                    }
                  >
                    {option.value === 'FALTANTE_NAO_FUNCIONA' ? 'Faltante' : option.label}
                  </button>
                );
              })}
            </div>
            {item === 'OUTRO' && draft.itens.OUTRO && (
              <Field
                label="Qual item?"
                data-testid="checklist-other"
                maxLength={100}
                value={draft.outro}
                error={errors.outro}
                onChange={(e) => change({ outro: e.target.value })}
              />
            )}
          </div>
        ))}
      </div>

      <div className="section-label">
        <h3>Mapa de avarias</h3>
        <small className="muted">{draft.avarias.length} marcada(s)</small>
      </div>
      <div
        className="choice-group damage-tools"
        role="radiogroup"
        aria-label="Tipo de avaria a marcar"
      >
        {damageTypes.map((type) => (
          <button
            type="button"
            key={type.value}
            role="radio"
            aria-checked={tool === type.value}
            className={'choice' + (tool === type.value ? ' active' : '')}
            data-testid={'damage-tool-' + type.value}
            onClick={() => setTool(type.value)}
          >
            <b>{type.value}</b> {type.label}
          </button>
        ))}
      </div>
      <p className="muted checklist-help">
        {full
          ? `Limite de ${MAX_DAMAGES} marcações atingido. Remova alguma para marcar outra.`
          : 'Escolha o tipo e toque no desenho onde está a avaria. Toque numa marcação para selecioná-la.'}
      </p>
      <DamageMap
        damages={draft.avarias}
        selected={selected}
        onSelect={setSelected}
        onAdd={(vista, posicaoX, posicaoY) => {
          if (full) return;
          change({
            avarias: [
              ...draft.avarias,
              { vista, tipo: tool, posicaoX, posicaoY, observacao: null },
            ],
          });
          setSelected(draft.avarias.length);
        }}
      />
      {draft.avarias.length > 0 && (
        <ol className="damage-list" data-testid="damage-list">
          {draft.avarias.map((damage, index) => (
            <li key={index} className={selected === index ? 'selected' : undefined}>
              <button
                type="button"
                className="damage-tag"
                aria-label={`Selecionar avaria ${index + 1}`}
                onClick={() => setSelected(index)}
              >
                <b>{damage.tipo}</b> {damageLabel(damage.tipo)} · {viewLabel(damage.vista)}
              </button>
              <input
                aria-label={`Observação da avaria ${index + 1}`}
                placeholder="Observação (opcional)"
                maxLength={200}
                data-testid="damage-note"
                value={damage.observacao ?? ''}
                onFocus={() => setSelected(index)}
                onChange={(e) => updateDamage(index, { observacao: e.target.value })}
              />
              <Button
                variant="ghost"
                aria-label={`Remover avaria ${index + 1}`}
                data-testid="damage-remove"
                onClick={() => {
                  change({ avarias: draft.avarias.filter((_, i) => i !== index) });
                  setSelected(null);
                }}
              >
                <Trash2 size={18} />
              </Button>
            </li>
          ))}
        </ol>
      )}

      <TextAreaField
        label="Observações"
        rows={3}
        maxLength={1000}
        data-testid="checklist-notes"
        value={draft.observacoes}
        error={errors.observacoes}
        onChange={(e) => change({ observacoes: e.target.value })}
      />
    </>
  );
}

function Report({ data }: { data: ChecklistEstadia }) {
  const saved = data.checkList;
  if (!saved)
    return (
      <p className="notice" data-testid="checklist-missing">
        O checklist não foi realizado nesta estadia.
      </p>
    );
  const pending = checklistItems.length - saved.itens.length;
  return (
    <div data-testid="checklist-report">
      <dl className="detail-grid">
        <div>
          <dt>Km atual</dt>
          <dd>{saved.kmAtual == null ? '—' : saved.kmAtual.toLocaleString('pt-BR') + ' km'}</dd>
        </div>
        <div>
          <dt>Última manutenção</dt>
          <dd>{saved.dataUltimaManutencao ? dateOnly(saved.dataUltimaManutencao) : '—'}</dd>
        </div>
        <div>
          <dt>Atendente</dt>
          <dd>{saved.atendente}</dd>
        </div>
        <div>
          <dt>Atualizado em</dt>
          <dd>{dateTime(saved.atualizadoEm)}</dd>
        </div>
      </dl>
      {!data.editavel && (
        <p className="notice">
          Estadia encerrada: o checklist está disponível apenas para consulta.
        </p>
      )}
      <div className="section-label">
        <h3>Itens verificados</h3>
        {pending > 0 && <small className="muted">{pending} não avaliado(s)</small>}
      </div>
      {saved.itens.length ? (
        <ul className="checklist-report-items" data-testid="checklist-report-items">
          {saved.itens.map((x) => (
            <li key={x.item}>
              <span>
                {itemLabel(x.item)}
                {x.descricao ? ': ' + x.descricao : ''}
              </span>
              <span className={'status-chip status-' + x.status.toLowerCase()}>
                {statusLabel(x.status)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">Nenhum item avaliado.</p>
      )}
      <div className="section-label">
        <h3>Mapa de avarias</h3>
        <small className="muted">{saved.avarias.length} marcada(s)</small>
      </div>
      <DamageMap damages={saved.avarias} />
      {saved.avarias.length > 0 && (
        <ol className="damage-list readonly">
          {saved.avarias.map((x, index) => (
            <li key={index}>
              <span className="damage-tag">
                <b>{x.tipo}</b> {damageLabel(x.tipo)} · {viewLabel(x.vista)}
              </span>
              {x.observacao && <span>{x.observacao}</span>}
            </li>
          ))}
        </ol>
      )}
      {saved.observacoes && (
        <>
          <div className="section-label">
            <h3>Observações</h3>
          </div>
          <p className="detail-note">{saved.observacoes}</p>
        </>
      )}
    </div>
  );
}
