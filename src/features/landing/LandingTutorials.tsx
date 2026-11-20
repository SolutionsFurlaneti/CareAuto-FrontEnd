import { useEffect, useId, useRef, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Container,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Step,
  StepContent,
  StepLabel,
  Stepper,
  SvgIcon,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { BookOpen, Check, Play, Video } from 'lucide-react';
import { useI18n } from '../../i18n';
import { passos } from './content';
import { tutoriais, type TutorialPublico } from './contentMedia';

/** Resolve links conhecidos; URLs ausentes ou incompatíveis usam o mesmo fallback editorial. */
export function tutorialMedia(
  url: string | null,
): { kind: 'iframe' | 'video'; src: string } | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return null;
    const host = parsed.hostname.toLowerCase();
    if (
      [
        'youtube.com',
        'www.youtube.com',
        'youtube-nocookie.com',
        'www.youtube-nocookie.com',
        'youtu.be',
      ].includes(host)
    ) {
      const id =
        host === 'youtu.be'
          ? parsed.pathname.slice(1)
          : parsed.pathname.startsWith('/embed/')
            ? parsed.pathname.slice(7)
            : parsed.searchParams.get('v');
      return id && /^[\w-]{11}$/.test(id)
        ? { kind: 'iframe', src: `https://www.youtube-nocookie.com/embed/${id}` }
        : null;
    }
    if (['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'].includes(host)) {
      const match = parsed.pathname.match(/^\/(?:video\/)?(\d+)\/?$/);
      return match ? { kind: 'iframe', src: `https://player.vimeo.com/video/${match[1]}` } : null;
    }
    return /\.(mp4|webm|ogg)$/i.test(parsed.pathname) ? { kind: 'video', src: parsed.href } : null;
  } catch {
    return null;
  }
}

export function TutorialPlayer({
  tutorial,
  instructionsId,
  onReadInstructions,
}: {
  tutorial: TutorialPublico;
  instructionsId?: string;
  onReadInstructions?: () => void;
}) {
  const { t } = useI18n();
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const hintId = useId();
  const media = tutorialMedia(tutorial.videoUrl);
  return (
    <CardMedia
      component="div"
      role="region"
      aria-label={t('Prévia do tutorial: {title}', { title: t(tutorial.titulo) })}
      data-testid="lp-tutorial-preview"
      sx={{
        position: 'relative',
        width: '100%',
        aspectRatio: '16 / 9',
        minHeight: 240,
        bgcolor: 'action.hover',
        borderBlock: 1,
        borderColor: 'divider',
      }}
    >
      {playing && media && !failed ? (
        media.kind === 'iframe' ? (
          <CardMedia
            component="iframe"
            src={media.src}
            title={t(tutorial.titulo)}
            loading="lazy"
            allow="encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            onError={() => setFailed(true)}
            data-testid="lp-tutorial-player"
            sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
          />
        ) : (
          <CardMedia
            component="video"
            src={media.src}
            title={t(tutorial.titulo)}
            controls
            preload="none"
            playsInline
            onError={() => setFailed(true)}
            data-testid="lp-tutorial-player"
            sx={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
            }}
          />
        )
      ) : (
        <Stack
          justifyContent="center"
          alignItems="center"
          spacing={1.5}
          sx={{ position: 'absolute', inset: 0, p: 2, textAlign: 'center' }}
        >
          {media && !failed && tutorial.posterUrl ? (
            <CardMedia
              component="img"
              image={tutorial.posterUrl}
              alt=""
              loading="lazy"
              sx={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                opacity: 0.2,
              }}
            />
          ) : null}
          <Box
            sx={{
              display: 'grid',
              placeItems: 'center',
              width: 56,
              height: 56,
              flexShrink: 0,
              borderRadius: '50%',
              bgcolor: 'background.paper',
              color: 'primary.main',
            }}
          >
            <SvgIcon component={Video} inheritViewBox sx={{ fontSize: 30 }} />
          </Box>
          {media && !failed ? (
            <Button
              variant="contained"
              startIcon={<SvgIcon component={Play} inheritViewBox />}
              onClick={() => setPlaying(true)}
              data-testid="lp-tutorial-play"
              sx={{ position: 'relative' }}
            >
              {t('Assistir ao tutorial')}
            </Button>
          ) : (
            <Stack spacing={1} alignItems="center" sx={{ position: 'relative', maxWidth: 380 }}>
              <Typography
                fontWeight={650}
                data-testid={failed ? 'lp-tutorial-unavailable' : 'lp-tutorial-coming-soon'}
                role={failed ? 'status' : undefined}
              >
                {t(failed ? 'Não foi possível carregar o vídeo' : 'Vídeo tutorial em breve')}
              </Typography>
              <Typography id={hintId} variant="body2" color="text.secondary">
                {t('Enquanto isso, siga as orientações desta etapa.')}
              </Typography>
              {onReadInstructions ? (
                <Button
                  variant="outlined"
                  startIcon={<SvgIcon component={BookOpen} inheritViewBox fontSize="small" />}
                  onClick={onReadInstructions}
                  aria-controls={instructionsId}
                  aria-describedby={hintId}
                  data-testid="lp-tutorial-read-instructions"
                  sx={{ minHeight: 48, maxWidth: '100%' }}
                >
                  {t('Ver orientações desta etapa')}
                </Button>
              ) : null}
            </Stack>
          )}
        </Stack>
      )}
    </CardMedia>
  );
}

export function LandingTutorials() {
  const { t } = useI18n();
  const [activeStep, setActiveStep] = useState(0);
  const nextTab = useRef<HTMLButtonElement>(null);
  const instructionsTitle = useRef<HTMLHeadingElement>(null);
  const moveFocus = useRef(false);
  useEffect(() => {
    if (moveFocus.current) {
      nextTab.current?.focus();
      moveFocus.current = false;
    }
  }, [activeStep]);
  const tutorial = tutoriais[activeStep];
  const instructionsId = `lp-tutorial-instructions-${tutorial.id}`;
  return (
    <Box
      component="section"
      id="como-funciona"
      aria-labelledby="lp-steps-title"
      sx={{ py: { xs: 8, md: 12 }, scrollMarginTop: 112, bgcolor: 'action.hover' }}
    >
      <Container maxWidth="lg">
        <Stack spacing={2} sx={{ mb: 5, maxWidth: 680 }}>
          <Typography variant="overline" color="primary.main" fontWeight={700}>
            {t('COMO FUNCIONA')}
          </Typography>
          <Typography
            id="lp-steps-title"
            variant="h2"
            sx={{ fontSize: { xs: '1.9rem', md: '2.6rem' }, fontWeight: 650 }}
          >
            {t('Comece hoje, em três passos')}
          </Typography>
          <Typography color="text.secondary">
            {t(
              'Do cadastro à primeira entrada: prepare seu estabelecimento e leve o controle para a rotina.',
            )}
          </Typography>
        </Stack>
        <Grid container spacing={{ xs: 4, md: 6 }} alignItems="start">
          <Grid size={{ xs: 12, md: 5 }}>
            <Stepper
              activeStep={activeStep}
              orientation="vertical"
              aria-label={t('Etapas para começar')}
              sx={{ '& .MuiStepLabel-label': { fontSize: '1.05rem', fontWeight: 600 } }}
            >
              {passos.map((passo, index) => (
                <Step
                  key={passo.titulo}
                  completed={false}
                  aria-current={activeStep === index ? 'step' : undefined}
                >
                  <StepLabel>{t(passo.titulo)}</StepLabel>
                  <StepContent>
                    <Typography color="text.secondary" sx={{ mb: 2 }}>
                      {t(passo.texto)}
                    </Typography>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        moveFocus.current = true;
                        setActiveStep((index + 1) % passos.length);
                      }}
                      data-testid={`lp-next-step-${index}`}
                    >
                      {t(index === passos.length - 1 ? 'Rever o cadastro' : 'Ver próxima etapa')}
                    </Button>
                  </StepContent>
                </Step>
              ))}
            </Stepper>
          </Grid>
          <Grid size={{ xs: 12, md: 7 }} sx={{ minWidth: 0 }}>
            <Card variant="outlined" sx={{ backgroundImage: 'none' }}>
              <Tabs
                value={activeStep}
                onChange={(_, value: number) => setActiveStep(value)}
                variant="scrollable"
                scrollButtons="auto"
                aria-label={t('Tutoriais por etapa')}
              >
                {['Cadastro', 'Configuração', 'Dia a dia'].map((nome, index) => (
                  <Tab
                    key={nome}
                    component="button"
                    ref={activeStep === index ? nextTab : undefined}
                    label={t(nome)}
                    id={`lp-tutorial-tab-${index}`}
                    aria-controls={`lp-tutorial-panel-${index}`}
                    data-testid={`lp-tutorial-tab-${index}`}
                    sx={{ textTransform: 'none', fontSize: '1rem' }}
                  />
                ))}
              </Tabs>
              <Box
                role="tabpanel"
                id={`lp-tutorial-panel-${activeStep}`}
                aria-labelledby={`lp-tutorial-tab-${activeStep}`}
              >
                <TutorialPlayer
                  key={tutorial.id}
                  tutorial={tutorial}
                  instructionsId={instructionsId}
                  onReadInstructions={() => instructionsTitle.current?.focus()}
                />
                <CardContent id={instructionsId} sx={{ p: { xs: 2, sm: 3 } }}>
                  <Chip
                    size="small"
                    label={t('Etapa {current} de {total}', {
                      current: activeStep + 1,
                      total: passos.length,
                    })}
                    role="status"
                    aria-live="polite"
                    aria-atomic="true"
                    data-testid="lp-tutorial-progress"
                    variant="outlined"
                    sx={{ mb: 2 }}
                  />
                  <Typography
                    ref={instructionsTitle}
                    variant="h3"
                    tabIndex={-1}
                    sx={{
                      fontSize: '1.2rem',
                      fontWeight: 650,
                      mb: 1,
                      scrollMarginTop: 112,
                      '&:focus-visible': {
                        outline: '2px solid',
                        outlineColor: 'primary.main',
                        outlineOffset: 4,
                      },
                    }}
                  >
                    {t(tutorial.titulo)}
                  </Typography>
                  {activeStep === 0 ? (
                    <Typography color="text.secondary" sx={{ mb: 2 }}>
                      {t(
                        'Informe os dados do negócio e crie o acesso do dono. Não pedimos cartão de crédito.',
                      )}
                    </Typography>
                  ) : null}
                  <List disablePadding>
                    {tutorial.orientacoes.map((texto) => (
                      <ListItem key={texto} disableGutters sx={{ alignItems: 'start', py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 30, mt: 0.5, color: 'primary.main' }}>
                          <SvgIcon component={Check} inheritViewBox fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary={t(texto)}
                          slotProps={{
                            primary: {
                              variant: 'body2',
                              color: 'text.secondary',
                              sx: { fontSize: '1rem' },
                            },
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>
                  {activeStep === 0 ? (
                    <Stack spacing={2} sx={{ mt: 2 }}>
                      <Stack direction="row" useFlexGap flexWrap="wrap" spacing={1}>
                        <Chip label={t('Sem cartão de crédito')} variant="outlined" size="small" />
                        <Chip label={t('7 dias grátis')} color="primary" size="small" />
                      </Stack>
                      <Button
                        component="a"
                        href="#planos"
                        variant="contained"
                        data-testid="lp-tutorial-signup"
                        sx={{ alignSelf: { xs: 'stretch', sm: 'start' }, minHeight: 48 }}
                      >
                        {t('Escolher plano e criar conta')}
                      </Button>
                    </Stack>
                  ) : null}
                </CardContent>
              </Box>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
