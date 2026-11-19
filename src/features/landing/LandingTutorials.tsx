import { useEffect, useRef, useState } from 'react';
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
import { Check, Play, Video } from 'lucide-react';
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

export function TutorialPlayer({ tutorial }: { tutorial: TutorialPublico }) {
  const [playing, setPlaying] = useState(false);
  const media = tutorialMedia(tutorial.videoUrl);
  return (
    <Box
      sx={{ position: 'relative', aspectRatio: '16 / 9', minHeight: 170, bgcolor: 'action.hover' }}
    >
      {playing && media ? (
        media.kind === 'iframe' ? (
          <CardMedia
            component="iframe"
            src={media.src}
            title={tutorial.titulo}
            loading="lazy"
            allow="encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            data-testid="lp-tutorial-player"
            sx={{ width: '100%', height: '100%', border: 0 }}
          />
        ) : (
          <CardMedia
            component="video"
            src={media.src}
            title={tutorial.titulo}
            controls
            preload="none"
            playsInline
            data-testid="lp-tutorial-player"
            sx={{ width: '100%', height: '100%' }}
          />
        )
      ) : (
        <Stack
          justifyContent="center"
          alignItems="center"
          spacing={1.5}
          sx={{ height: '100%', p: 2, textAlign: 'center' }}
        >
          {media && tutorial.posterUrl ? (
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
          <SvgIcon component={Video} inheritViewBox sx={{ fontSize: 40, color: 'primary.main' }} />
          {media ? (
            <Button
              variant="contained"
              startIcon={<SvgIcon component={Play} inheritViewBox />}
              onClick={() => setPlaying(true)}
              data-testid="lp-tutorial-play"
              sx={{ position: 'relative' }}
            >
              Assistir ao tutorial
            </Button>
          ) : (
            <>
              <Typography fontWeight={650} data-testid="lp-tutorial-coming-soon">
                Vídeo tutorial em breve
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Enquanto isso, siga as orientações desta etapa.
              </Typography>
            </>
          )}
        </Stack>
      )}
    </Box>
  );
}

export function LandingTutorials() {
  const [activeStep, setActiveStep] = useState(0);
  const nextTab = useRef<HTMLButtonElement>(null);
  const moveFocus = useRef(false);
  useEffect(() => {
    if (moveFocus.current) {
      nextTab.current?.focus();
      moveFocus.current = false;
    }
  }, [activeStep]);
  const tutorial = tutoriais[activeStep];
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
            COMO FUNCIONA
          </Typography>
          <Typography
            id="lp-steps-title"
            variant="h2"
            sx={{ fontSize: { xs: '1.9rem', md: '2.6rem' }, fontWeight: 650 }}
          >
            Comece hoje, em três passos
          </Typography>
          <Typography color="text.secondary">
            Do cadastro à primeira entrada: prepare seu estabelecimento e leve o controle para a
            rotina.
          </Typography>
        </Stack>
        <Grid container spacing={{ xs: 4, md: 6 }} alignItems="start">
          <Grid size={{ xs: 12, md: 5 }}>
            <Stepper
              activeStep={activeStep}
              orientation="vertical"
              sx={{ '& .MuiStepLabel-label': { fontSize: '1.05rem', fontWeight: 600 } }}
            >
              {passos.map((passo, index) => (
                <Step key={passo.titulo}>
                  <StepLabel>{passo.titulo}</StepLabel>
                  <StepContent>
                    <Typography color="text.secondary" sx={{ mb: 2 }}>
                      {passo.texto}
                    </Typography>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        moveFocus.current = true;
                        setActiveStep((index + 1) % passos.length);
                      }}
                      data-testid={`lp-next-step-${index}`}
                    >
                      {index === passos.length - 1 ? 'Rever o cadastro' : 'Próxima etapa'}
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
                aria-label="Tutoriais por etapa"
              >
                {['Cadastro', 'Configuração', 'Dia a dia'].map((nome, index) => (
                  <Tab
                    key={nome}
                    component="button"
                    ref={activeStep === index ? nextTab : undefined}
                    label={nome}
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
                <TutorialPlayer key={tutorial.id} tutorial={tutorial} />
                <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                  <Chip
                    size="small"
                    label={`Etapa ${activeStep + 1} de ${passos.length}`}
                    variant="outlined"
                    sx={{ mb: 2 }}
                  />
                  <Typography variant="h3" sx={{ fontSize: '1.2rem', fontWeight: 650, mb: 1 }}>
                    {tutorial.titulo}
                  </Typography>
                  <List disablePadding>
                    {tutorial.orientacoes.map((texto) => (
                      <ListItem key={texto} disableGutters sx={{ alignItems: 'start', py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 30, mt: 0.5, color: 'primary.main' }}>
                          <SvgIcon component={Check} inheritViewBox fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary={texto}
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
                </CardContent>
              </Box>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
