import type { StatusItem, TipoAvaria, Vista } from './api';

/** Itens do formulário em papel, na mesma ordem. O servidor valida os mesmos códigos. */
export const checklistItems: { item: string; label: string }[] = [
  { item: 'FAROIS_LAMPADAS_PISCAS', label: 'Faróis, lâmpadas e piscas' },
  { item: 'ESTEPE_CHAVE_RODA', label: 'Estepe e chave de roda' },
  { item: 'MACACO_TRIANGULO', label: 'Macaco e triângulo' },
  { item: 'LIMPADOR_LAVADOR', label: 'Limpador e lavador' },
  { item: 'EXTINTOR', label: 'Extintor' },
  { item: 'BUZINA', label: 'Buzina' },
  { item: 'PNEUS_DIANTEIROS', label: 'Pneus dianteiros' },
  { item: 'PNEUS_TRASEIROS', label: 'Pneus traseiros' },
  { item: 'CALOTAS_RODAS', label: 'Calotas e rodas' },
  { item: 'FREIOS', label: 'Freios (pé e mão)' },
  { item: 'CINTO_SEGURANCA', label: 'Cinto de segurança' },
  { item: 'INDICADORES_PAINEL', label: 'Indicadores do painel' },
  { item: 'OLEO_MOTOR', label: 'Óleo do motor' },
  { item: 'FLUIDO_FREIO', label: 'Fluido de freio' },
  { item: 'LIQUIDO_ARREFECIMENTO', label: 'Líquido de arrefecimento' },
  { item: 'MOTOR_PARTIDA', label: 'Motor de partida' },
  { item: 'FECHAMENTO_JANELAS', label: 'Fechamento das janelas' },
  { item: 'TAPETES', label: 'Tapetes' },
  { item: 'ANTENA_TAMPAO', label: 'Antena e tampão traseiro' },
  { item: 'OUTRO', label: 'Outro' },
];
export const itemLabel = (item: string) =>
  checklistItems.find((x) => x.item === item)?.label ?? item;

export const statusOptions: { value: StatusItem; label: string }[] = [
  { value: 'BOM', label: 'Bom' },
  { value: 'RUIM', label: 'Ruim' },
  { value: 'FALTANTE_NAO_FUNCIONA', label: 'Faltante / não funciona' },
];
export const statusLabel = (status: StatusItem) =>
  statusOptions.find((x) => x.value === status)?.label ?? status;

export const damageTypes: { value: TipoAvaria; label: string }[] = [
  { value: 'A', label: 'Amassado' },
  { value: 'R', label: 'Riscado' },
  { value: 'X', label: 'Quebrado' },
  { value: 'F', label: 'Faltante' },
];
export const damageLabel = (tipo: TipoAvaria) =>
  damageTypes.find((x) => x.value === tipo)?.label ?? tipo;

export const views: { value: Vista; label: string }[] = [
  { value: 'TOPO', label: 'Vista superior' },
  { value: 'LATERAL_ESQ', label: 'Lateral esquerda' },
  { value: 'LATERAL_DIR', label: 'Lateral direita' },
  { value: 'FRENTE', label: 'Frente' },
  { value: 'TRASEIRA', label: 'Traseira' },
];
export const viewLabel = (vista: Vista) => views.find((x) => x.value === vista)?.label ?? vista;
export const MAX_DAMAGES = 100;
