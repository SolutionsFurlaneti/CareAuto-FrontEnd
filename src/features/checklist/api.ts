import { api } from '../../lib/apiClient';

export type StatusItem = 'BOM' | 'RUIM' | 'FALTANTE_NAO_FUNCIONA';
export type Vista = 'TOPO' | 'FRENTE' | 'TRASEIRA' | 'LATERAL_ESQ' | 'LATERAL_DIR';
export type TipoAvaria = 'A' | 'R' | 'X' | 'F';
export interface ItemChecklist {
  item: string;
  status: StatusItem;
  descricao: string | null;
}
/** Posição em percentual (0–100) da vista, independente do tamanho da tela. */
export interface Avaria {
  vista: Vista;
  tipo: TipoAvaria;
  posicaoX: number;
  posicaoY: number;
  observacao: string | null;
}
export interface Checklist {
  checkListId: number;
  kmAtual: number | null;
  dataUltimaManutencao: string | null;
  observacoes: string | null;
  atendente: string;
  criadoEm: string;
  atualizadoEm: string;
  versao: string;
  itens: ItemChecklist[];
  avarias: Avaria[];
}
export interface ChecklistEstadia {
  estadiaId: number;
  statusEstadia: string;
  /** Somente estadias em andamento aceitam alterações. */
  editavel: boolean;
  dataEntrada: string;
  placa: string;
  marca: string | null;
  modelo: string | null;
  cor: string | null;
  clienteNome: string | null;
  clienteTelefone: string | null;
  checkList: Checklist | null;
}
export interface ChecklistInput {
  kmAtual: number | null;
  dataUltimaManutencao: string | null;
  observacoes: string | null;
  itens: ItemChecklist[];
  avarias: Avaria[];
  versao: string | null;
}

const url = (estadiaId: number) => '/api/v1/estadias/' + estadiaId + '/checklist';
export const getChecklist = (estadiaId: number, signal?: AbortSignal) =>
  api<ChecklistEstadia>(url(estadiaId), { signal });
export const saveChecklist = (estadiaId: number, data: ChecklistInput) =>
  api<ChecklistEstadia>(url(estadiaId), { method: 'PUT', body: JSON.stringify(data) });
