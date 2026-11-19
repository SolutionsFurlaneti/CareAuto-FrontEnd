import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  AppBar,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Container,
  Divider,
  Drawer,
  Fab,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  SvgIcon,
  Toolbar,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  CarFront,
  Check,
  ChevronDown,
  Menu,
  MessageCircle,
  Moon,
  Play,
  ShieldCheck,
  Sun,
  X,
} from 'lucide-react';
import { useThemeStore } from '../../stores/themeStore';
import { destaques, funcionalidades, gruposFuncionalidades, perguntas } from './content';
import { LandingPlans } from './LandingPlans';
import { LandingSimulator } from './LandingSimulator';
import { LandingTutorials } from './LandingTutorials';
import { LandingTestimonials } from './LandingTestimonials';

const TITULO = 'CareAuto | Sistema para estacionamento e lava-rápido · 7 dias grátis';
const DESCRICAO =
  'Controle entradas e saídas, leia placas por foto com IA, imprima tickets com QR Code, faça checklist de avarias e receba por Pix, boleto e cartão. Teste grátis por 7 dias.';
const CADASTRO = '/primeiro-acesso';
const WHATSAPP_HREF =
  'https://wa.me/5511978504405?text=' +
  encodeURIComponent('Quero mais informações sobre o CareAuto');
const links = [
  ['#como-funciona', 'Como funciona'],
  ['#funcionalidades', 'Funcionalidades'],
  ['#simulador', 'Simulador'],
  ['#planos', 'Planos'],
  ['#depoimentos', 'Depoimentos'],
] as const;

function useSeo() {
  useEffect(() => {
    const titulo = document.title;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const criada = !meta;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.appendChild(meta);
    }
    const descricao = meta.content;
    document.title = TITULO;
    meta.content = DESCRICAO;
    return () => {
      document.title = titulo;
      if (criada) meta.remove();
      else meta.content = descricao;
    };
  }, []);
}

function LandingHeader() {
  const [menu, setMenu] = useState(false);
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('lg'));
  const compact = useMediaQuery(theme.breakpoints.down('sm'));
  const mode = useThemeStore((s) => s.theme);
  const toggle = useThemeStore((s) => s.toggle);
  const themeControl = (
    <IconButton
      onClick={toggle}
      aria-label={mode === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
      data-testid="lp-theme-toggle"
      sx={{ width: 48 }}
    >
      <SvgIcon component={mode === 'dark' ? Sun : Moon} inheritViewBox sx={{ fill: 'none' }} />
    </IconButton>
  );
  useEffect(() => {
    if (desktop) setMenu(false);
  }, [desktop]);
  return (
    <AppBar
      position="sticky"
      color="transparent"
      elevation={0}
      sx={{
        bgcolor: 'background.default',
        borderBottom: 1,
        borderColor: 'divider',
        top: 'var(--app-safe-area-inset-top, 0px)',
      }}
    >
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ gap: { xs: 0.5, sm: 1.5 }, minHeight: { xs: 72, sm: 80 } }}>
          <Stack
            component={Link}
            to="/"
            direction="row"
            spacing={1}
            alignItems="center"
            aria-label="CareAuto, início"
            sx={{ mr: 'auto', color: 'text.primary' }}
          >
            <Avatar
              variant="rounded"
              sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', width: 36, height: 36 }}
            >
              <SvgIcon component={CarFront} inheritViewBox />
            </Avatar>
            <Typography
              component="span"
              sx={{
                fontWeight: 750,
                fontSize: { xs: '1.1rem', sm: '1.4rem' },
                letterSpacing: '-.04em',
              }}
            >
              CareAuto
            </Typography>
          </Stack>
          {desktop && (
            <Stack component="nav" aria-label="Seções" direction="row" spacing={0.5}>
              {links.map(([href, nome]) => (
                <Button key={href} href={href} color="inherit" sx={{ fontSize: '.875rem', px: 1 }}>
                  {nome}
                </Button>
              ))}
              <Button component={Link} to="/login" color="inherit">
                Entrar
              </Button>
            </Stack>
          )}
          {!compact && themeControl}
          <Button
            component={Link}
            to={CADASTRO}
            variant="contained"
            data-testid="lp-header-cta"
            sx={{ px: { xs: 1.25, sm: 2 }, flexShrink: 0, fontSize: { xs: '.875rem', sm: '1rem' } }}
          >
            Criar conta
          </Button>
          {!desktop && (
            <IconButton
              aria-label="Abrir menu"
              aria-expanded={menu}
              aria-controls={menu ? 'landing-menu' : undefined}
              onClick={() => setMenu(true)}
              data-testid="lp-menu"
              sx={{ width: 48 }}
            >
              <SvgIcon component={Menu} inheritViewBox />
            </IconButton>
          )}
        </Toolbar>
      </Container>
      {!desktop && (
        <Drawer
          anchor="right"
          open={menu}
          onClose={() => setMenu(false)}
          slotProps={{ paper: { sx: { width: 'min(320px, 100vw)', p: 2 } } }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">Explore o CareAuto</Typography>
            <IconButton aria-label="Fechar menu" onClick={() => setMenu(false)}>
              <SvgIcon component={X} inheritViewBox />
            </IconButton>
          </Stack>
          <List component="nav" id="landing-menu" aria-label="Seções">
            {links.map(([href, nome]) => (
              <ListItemButton key={href} component="a" href={href} onClick={() => setMenu(false)}>
                <ListItemText primary={nome} />
              </ListItemButton>
            ))}
            <Divider sx={{ my: 1 }} />
            <ListItemButton component={Link} to="/login">
              <ListItemText primary="Entrar na minha conta" />
            </ListItemButton>
          </List>
          {compact && (
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography>Tema da página</Typography>
              {themeControl}
            </Stack>
          )}
        </Drawer>
      )}
    </AppBar>
  );
}

function DashboardPreview() {
  const activity = [
    { icon: CarFront, title: 'Entrada registrada', description: 'BRA2E19 · categoria passeio' },
    {
      icon: ShieldCheck,
      title: 'Checklist conferido',
      description: 'Condições do veículo documentadas',
    },
    { icon: Check, title: 'Pagamento acompanhado', description: 'Pix, boleto ou cartão via Asaas' },
  ];
  return (
    <Paper
      component="figure"
      variant="outlined"
      aria-label="Exemplo ilustrativo do painel do CareAuto"
      sx={{
        m: 0,
        p: { xs: 2.5, md: 3.5 },
        bgcolor: 'background.paper',
        boxShadow: '0 24px 80px rgb(0 0 0 / 12%)',
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
        <SvgIcon component={CarFront} inheritViewBox color="primary" />
        <Typography fontWeight={700}>Visão geral</Typography>
        <Chip label="Demonstração" size="small" variant="outlined" sx={{ ml: 'auto !important' }} />
      </Stack>
      <Typography variant="h3" sx={{ mb: 1 }}>
        Seu dia, sob controle.
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Do primeiro veículo ao último recebimento.
      </Typography>
      <Grid container spacing={1.5}>
        {[
          ['No pátio', '18'],
          ['Entradas hoje', '42'],
          ['Recebido', 'R$ 1.284'],
        ].map(([label, value]) => (
          <Grid key={label} size={{ xs: 12, sm: 4 }}>
            <Box sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {label}
              </Typography>
              <Typography sx={{ fontWeight: 750, fontSize: '1.4rem', whiteSpace: 'nowrap' }}>
                {value}
              </Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
      <Divider sx={{ my: 3 }} />
      <Stack spacing={2}>
        {activity.map(({ icon: Icon, title, description }) => (
          <Stack key={title} direction="row" spacing={1.5} alignItems="center">
            <Avatar sx={{ bgcolor: 'action.selected', color: 'primary.main' }}>
              <SvgIcon component={Icon} inheritViewBox />
            </Avatar>
            <Box>
              <Typography fontWeight={650}>{title}</Typography>
              <Typography variant="body2" color="text.secondary">
                {description}
              </Typography>
            </Box>
          </Stack>
        ))}
      </Stack>
      <Typography component="figcaption" variant="body2" color="text.secondary" sx={{ mt: 3 }}>
        Exemplo ilustrativo com dados fictícios.
      </Typography>
    </Paper>
  );
}

function Features() {
  return (
    <Box
      component="section"
      id="funcionalidades"
      aria-labelledby="lp-func-title"
      sx={{ py: { xs: 7, md: 11 } }}
    >
      <Container maxWidth="lg">
        <Typography variant="overline" color="primary">
          Funcionalidades
        </Typography>
        <Typography variant="h2" id="lp-func-title" sx={{ maxWidth: 700 }}>
          Feito para a rotina de quem cuida de veículos
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 2, mb: 4, maxWidth: 650 }}>
          Menos papel e menos digitação na guarita. Mais controle do pátio e do dinheiro.
        </Typography>
        <Grid container spacing={2.5} sx={{ mb: 6 }}>
          {destaques.map(({ icone: Icone, titulo, texto }) => (
            <Grid key={titulo} size={{ xs: 12, md: 4 }}>
              <Card component="article" variant="outlined" sx={{ height: '100%' }}>
                <CardHeader
                  avatar={
                    <Avatar sx={{ bgcolor: 'action.selected', color: 'primary.main' }}>
                      <SvgIcon component={Icone} inheritViewBox />
                    </Avatar>
                  }
                  title={titulo}
                  slotProps={{ title: { component: 'h3', variant: 'h6' } }}
                />
                <CardContent sx={{ pt: 0 }}>
                  <Chip
                    size="small"
                    label="Incluído em todos os planos"
                    variant="outlined"
                    sx={{ mb: 2, maxWidth: '100%' }}
                  />
                  <Typography color="text.secondary">{texto}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
        <Stack spacing={4} data-testid="lp-features">
          {gruposFuncionalidades.map(({ id, titulo }) => (
            <Box key={id}>
              <Typography variant="h3" sx={{ mb: 2 }}>
                {titulo}
              </Typography>
              <Grid container spacing={2}>
                {funcionalidades
                  .filter((f) => f.grupo === id)
                  .map(({ icone: Icone, titulo: nome, texto }) => (
                    <Grid key={nome} size={{ xs: 12, sm: 6, md: 4 }}>
                      <Card
                        component="article"
                        variant="outlined"
                        sx={{ height: '100%', boxShadow: 'none' }}
                      >
                        <CardHeader
                          avatar={<SvgIcon component={Icone} inheritViewBox color="primary" />}
                          title={nome}
                          slotProps={{
                            title: { component: 'h4', variant: 'h6', sx: { fontSize: '1rem' } },
                          }}
                        />
                        <CardContent sx={{ pt: 0 }}>
                          <Typography color="text.secondary">{texto}</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
              </Grid>
            </Box>
          ))}
        </Stack>
      </Container>
    </Box>
  );
}

export function AboutPage() {
  useSeo();
  return (
    <Box
      className="landing-home"
      sx={{
        color: 'text.primary',
        bgcolor: 'background.default',
        minHeight: '100dvh',
        '& section[id]': { scrollMarginTop: 112 },
        '& .MuiTypography-h2': {
          fontWeight: 750,
          fontSize: { xs: '1.9rem', md: '2.5rem' },
          lineHeight: 1.15,
          letterSpacing: '-.035em',
        },
        '& h3.MuiTypography-h3': { fontWeight: 700, fontSize: '1.35rem', lineHeight: 1.3 },
        '& .MuiTypography-h6': { lineHeight: 1.4 },
        '& .MuiTypography-body1': { lineHeight: 1.7 },
        '& .MuiTypography-body2': { fontSize: '.875rem' },
        '& .MuiButton-root': { textTransform: 'none', fontWeight: 650 },
        '& .MuiCard-root': { backgroundImage: 'none' },
        '& .MuiSvgIcon-root.lucide': { fill: 'none' },
        '& .MuiGrid-root, & .MuiCardContent-root': { minWidth: 0 },
      }}
    >
      <Button
        href="#conteudo"
        sx={{
          position: 'fixed',
          top: -100,
          left: 8,
          zIndex: 1500,
          bgcolor: 'background.paper',
          '&:focus': { top: 8 },
        }}
      >
        Pular para o conteúdo
      </Button>
      <LandingHeader />
      <Box component="main" id="conteudo">
        <Box
          component="section"
          id="sobre"
          aria-labelledby="lp-hero-title"
          sx={{
            pt: { xs: 6, md: 10 },
            pb: { xs: 7, md: 11 },
            background: (t) =>
              `radial-gradient(ellipse at 90% 20%, ${t.palette.mode === 'dark' ? '#233c2c' : '#e1efdf'}, transparent 65%)`,
          }}
        >
          <Container maxWidth="lg">
            <Grid container spacing={{ xs: 5, md: 7 }} alignItems="center">
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography
                  variant="overline"
                  color="primary"
                  sx={{ letterSpacing: '.1em', lineHeight: 1.7, display: 'block', mb: 2 }}
                >
                  Sistema para estacionamento e lava-rápido
                </Typography>
                <Typography
                  variant="h1"
                  id="lp-hero-title"
                  sx={{
                    fontWeight: 800,
                    fontSize: { xs: '2.7rem', sm: '3.5rem', md: '3.9rem' },
                    letterSpacing: '-.055em',
                    lineHeight: 1.05,
                    mb: 3,
                  }}
                >
                  Do portão ao caixa,
                  <Box component="span" sx={{ color: 'primary.main', display: 'block' }}>
                    tudo sob controle.
                  </Box>
                </Typography>
                <Typography
                  variant="subtitle1"
                  component="p"
                  color="text.secondary"
                  sx={{ fontSize: '1.125rem', lineHeight: 1.75, mb: 3.5 }}
                >
                  O CareAuto registra entradas e saídas, lê a placa por foto, imprime o ticket, faz
                  o checklist de avarias e cobra por Pix, boleto ou cartão. Tudo num só lugar, no
                  celular ou no computador.
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <Button
                    variant="contained"
                    size="large"
                    component={Link}
                    to={CADASTRO}
                    data-testid="lp-hero-cta"
                  >
                    Começar 7 dias grátis
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    href="#como-funciona"
                    startIcon={<SvgIcon component={Play} inheritViewBox />}
                  >
                    Ver demonstração
                  </Button>
                </Stack>
                <List dense sx={{ mt: 2 }}>
                  {[
                    'Sem cartão de crédito no cadastro',
                    'Todas as funcionalidades no teste',
                    'Funciona no navegador',
                  ].map((text) => (
                    <ListItem key={text} disableGutters>
                      <ListItemIcon sx={{ minWidth: 30, color: 'primary.main' }}>
                        <SvgIcon component={Check} inheritViewBox sx={{ fontSize: 18 }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={text}
                        slotProps={{ primary: { variant: 'body2', color: 'text.secondary' } }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <DashboardPreview />
              </Grid>
            </Grid>
          </Container>
        </Box>
        <LandingTutorials />
        <Features />
        <LandingSimulator />
        <LandingTestimonials />
        <LandingPlans />
        <Box
          component="section"
          id="duvidas"
          aria-labelledby="lp-faq-title"
          sx={{ py: { xs: 7, md: 10 } }}
        >
          <Container maxWidth="md">
            <Typography variant="overline" color="primary">
              Dúvidas
            </Typography>
            <Typography variant="h2" id="lp-faq-title" sx={{ mb: 4 }}>
              Perguntas frequentes
            </Typography>
            {perguntas.map((q, i) => (
              <Accordion
                key={q.pergunta}
                disableGutters
                elevation={0}
                sx={{
                  bgcolor: 'transparent',
                  '&:before': { display: 'none' },
                  borderBottom: 1,
                  borderColor: 'divider',
                }}
              >
                <AccordionSummary
                  expandIcon={<SvgIcon component={ChevronDown} inheritViewBox />}
                  id={`lp-faq-${i}`}
                  aria-controls={`lp-faq-answer-${i}`}
                >
                  <Typography component="span" fontWeight={650}>
                    {q.pergunta}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails id={`lp-faq-answer-${i}`}>
                  <Typography color="text.secondary">{q.resposta}</Typography>
                </AccordionDetails>
              </Accordion>
            ))}
          </Container>
        </Box>
        <Box
          component="section"
          aria-labelledby="lp-final-title"
          sx={{ py: { xs: 7, md: 10 }, bgcolor: 'action.selected', textAlign: 'center' }}
        >
          <Container maxWidth="md">
            <Typography variant="h2" id="lp-final-title">
              Pronto para organizar seu estacionamento?
            </Typography>
            <Typography color="text.secondary" sx={{ my: 3 }}>
              Cadastre-se agora e use o CareAuto completo por 7 dias, sem custo.
            </Typography>
            <Button
              component={Link}
              to={CADASTRO}
              variant="contained"
              size="large"
              data-testid="lp-final-cta"
            >
              Criar minha conta grátis
            </Button>
          </Container>
        </Box>
      </Box>
      <Container component="footer" maxWidth="lg" sx={{ py: 4, pb: { xs: 12, sm: 4 } }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
        >
          <Typography variant="body2" color="text.secondary">
            © {new Date().getFullYear()} CareAuto · Furlaneti Consultoria
          </Typography>
          <Button component={Link} to="/login">
            Já sou cliente: entrar
          </Button>
        </Stack>
      </Container>
      <Fab
        component="a"
        href={WHATSAPP_HREF}
        target="_blank"
        rel="noopener noreferrer"
        color="primary"
        aria-label="Conversar com o CareAuto pelo WhatsApp"
        data-testid="lp-whatsapp"
        sx={{
          position: 'fixed',
          bottom: 'calc(20px + var(--app-safe-area-inset-bottom, 0px))',
          right: 20,
        }}
      >
        <SvgIcon component={MessageCircle} inheritViewBox />
      </Fab>
    </Box>
  );
}
