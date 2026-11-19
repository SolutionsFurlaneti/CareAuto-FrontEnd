/** Publicar somente vídeos revisados e relatos reais, com autorização dos clientes. */
export interface TutorialPublico {
  id: string;
  titulo: string;
  videoUrl: string | null;
  posterUrl: string | null;
  orientacoes: readonly string[];
}

/** Preencha videoUrl com um vídeo HTTPS (MP4/WebM/Ogg) ou link YouTube/Vimeo. */
export const tutoriais: readonly TutorialPublico[] = [
  {
    id: 'conta',
    titulo: 'Crie sua conta de administrador',
    videoUrl: null,
    posterUrl: null,
    orientacoes: [
      'Escolha um plano e informe os dados do estabelecimento.',
      'Cadastre o nome, o e-mail e a senha do responsável.',
      'Acesse o painel para começar a configuração do negócio.',
    ],
  },
  {
    id: 'configuracao',
    titulo: 'Prepare a operação do seu negócio',
    videoUrl: null,
    posterUrl: null,
    orientacoes: [
      'Cadastre as categorias de veículo e as tabelas de preço.',
      'Defina os serviços e os preços de cada categoria.',
      'Crie os acessos da equipe e configure as integrações que pretende usar.',
    ],
  },
  {
    id: 'operacao',
    titulo: 'Da primeira entrada ao recebimento',
    videoUrl: null,
    posterUrl: null,
    orientacoes: [
      'Informe a placa ou fotografe e confira a leitura antes de confirmar a entrada.',
      'Registre o checklist, emita o ticket e adicione os serviços realizados.',
      'Finalize a estadia e acompanhe os pagamentos no painel.',
    ],
  },
];

export interface DepoimentoPublico {
  id: string;
  nome: string;
  perfil: string;
  relato: string;
  avaliacao: number;
  fotoUrl?: string | null;
}

/** Sem relatos publicados até que conteúdo e autorização reais estejam disponíveis. */
export const depoimentos: readonly DepoimentoPublico[] = [];
