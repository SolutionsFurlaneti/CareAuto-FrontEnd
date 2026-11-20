import { useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Grid,
  Paper,
  Rating,
  Stack,
  SvgIcon,
  Typography,
} from '@mui/material';
import { MessageSquareQuote } from 'lucide-react';
import { useI18n } from '../../i18n';
import { depoimentos, type DepoimentoPublico } from './contentMedia';

export function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  return partes.length > 1
    ? `${partes[0][0]}${partes[partes.length - 1][0]}`.toLocaleUpperCase('pt-BR')
    : (partes[0]?.slice(0, 2).toLocaleUpperCase('pt-BR') ?? 'CA');
}

export function TestimonialCard({ depoimento }: { depoimento: DepoimentoPublico }) {
  const { t } = useI18n();
  const [fotoFalhou, setFotoFalhou] = useState(false);
  return (
    <Card
      component="article"
      variant="outlined"
      sx={{ height: '100%', backgroundImage: 'none' }}
      data-testid="lp-testimonial"
    >
      <CardContent sx={{ p: 3 }}>
        <Stack spacing={2.5}>
          <Rating
            name={`avaliacao-${depoimento.id}`}
            value={Math.max(
              0,
              Math.min(5, Number.isFinite(depoimento.avaliacao) ? depoimento.avaliacao : 0),
            )}
            precision={0.5}
            readOnly
            getLabelText={(value) => t('{value} de 5 estrelas', { value })}
            sx={{ color: 'primary.main' }}
          />
          <Typography
            component="blockquote"
            sx={{ m: 0, fontSize: '1rem', lineHeight: 1.8, overflowWrap: 'anywhere' }}
          >
            “{depoimento.relato}”
          </Typography>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar
              src={!fotoFalhou ? (depoimento.fotoUrl ?? undefined) : undefined}
              alt={depoimento.nome}
              slotProps={{ img: { onError: () => setFotoFalhou(true) } }}
              sx={{ bgcolor: 'primary.main', color: 'primary.contrastText' }}
            >
              {iniciais(depoimento.nome)}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography fontWeight={650} sx={{ overflowWrap: 'anywhere' }}>
                {depoimento.nome}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
                {depoimento.perfil}
              </Typography>
            </Box>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

export function LandingTestimonials() {
  const { t } = useI18n();
  return (
    <Box
      component="section"
      id="depoimentos"
      aria-labelledby="lp-testimonials-title"
      sx={{ py: { xs: 8, md: 12 }, scrollMarginTop: 112 }}
    >
      <Container maxWidth="lg">
        <Stack spacing={2} sx={{ mb: 4, maxWidth: 680 }}>
          <Typography variant="overline" color="primary.main" fontWeight={700}>
            {t('DEPOIMENTOS')}
          </Typography>
          <Typography
            id="lp-testimonials-title"
            variant="h2"
            sx={{ fontSize: { xs: '1.9rem', md: '2.6rem' }, fontWeight: 650 }}
          >
            {t('Quem usa tem uma história para contar')}
          </Typography>
        </Stack>
        {depoimentos.length ? (
          <Grid container spacing={3}>
            {depoimentos.map((depoimento) => (
              <Grid key={depoimento.id} size={{ xs: 12, md: 4 }}>
                <TestimonialCard depoimento={depoimento} />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Paper
            variant="outlined"
            sx={{ p: { xs: 3, md: 5 }, backgroundImage: 'none' }}
            data-testid="lp-testimonials-empty"
          >
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={3}
              alignItems={{ xs: 'start', sm: 'center' }}
            >
              <SvgIcon
                component={MessageSquareQuote}
                inheritViewBox
                sx={{ color: 'primary.main', fontSize: 44 }}
              />
              <Box sx={{ flex: 1 }}>
                <Typography variant="h3" sx={{ fontSize: '1.25rem', fontWeight: 650, mb: 1 }}>
                  {t('Relatos de clientes em breve')}
                </Typography>
                <Typography color="text.secondary">
                  {t(
                    'Enquanto preparamos esta seção, conheça os recursos e experimente o CareAuto na rotina do seu estabelecimento.',
                  )}
                </Typography>
              </Box>
              <Button href="#planos" variant="outlined" sx={{ flexShrink: 0, minHeight: 48 }}>
                {t('Conhecer os planos')}
              </Button>
            </Stack>
          </Paper>
        )}
      </Container>
    </Box>
  );
}
