import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  Chip,
  Container,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Skeleton,
  Stack,
  SvgIcon,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { Check } from 'lucide-react';
import { money } from '../../lib/format';
import { agrupar, destaque, listarPlanosPublicos, oferta, type PlanoPublico } from './plans';

function PlanCard({ plano, recomendado }: { plano: PlanoPublico; recomendado: boolean }) {
  const o = oferta(plano);
  return (
    <Card
      component="article"
      variant="outlined"
      data-testid="lp-plan"
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderWidth: recomendado ? 2 : 1,
        borderColor: recomendado ? 'primary.main' : 'divider',
        boxShadow: recomendado ? 6 : 0,
      }}
    >
      <CardHeader
        title={plano.nome}
        sx={{ '& .MuiCardHeader-content': { minWidth: 0 } }}
        slotProps={{ title: { component: 'h3', variant: 'h3', sx: { overflowWrap: 'anywhere' } } }}
        subheader={
          <Chip
            label={
              recomendado ? 'Recomendado' : plano.tipo === 'PRE_PAGO' ? 'Pré-pago' : 'Pós-pago'
            }
            color={recomendado ? 'primary' : 'default'}
            size="small"
            sx={{ mt: 1.5 }}
          />
        }
      />
      <CardContent sx={{ pt: 0, flexGrow: 1 }}>
        <Stack direction="row" spacing={0.5} alignItems="baseline" flexWrap="wrap">
          <Typography
            sx={{
              fontSize: '2.1rem',
              fontWeight: 750,
              letterSpacing: '-.04em',
              overflowWrap: 'anywhere',
              minWidth: 0,
            }}
          >
            {money(o.mensal)}
          </Typography>
          <Typography color="text.secondary">/mês</Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {o.cobranca}
        </Typography>
        {o.economia && (
          <Typography color="primary" fontWeight={650} sx={{ mt: 1 }}>
            {o.economia}
          </Typography>
        )}
        {plano.descricao && (
          <Typography color="text.secondary" sx={{ mt: 2, overflowWrap: 'anywhere' }}>
            {plano.descricao}
          </Typography>
        )}
        <List sx={{ mt: 2 }}>
          {[
            'Todas as funcionalidades',
            'Usuários para a sua equipe',
            '7 dias grátis antes da 1ª cobrança',
          ].map((text) => (
            <ListItem key={text} disableGutters>
              <ListItemIcon sx={{ minWidth: 28, color: 'primary.main' }}>
                <SvgIcon component={Check} inheritViewBox sx={{ fontSize: 20 }} />
              </ListItemIcon>
              <ListItemText primary={text} slotProps={{ primary: { variant: 'body2' } }} />
            </ListItem>
          ))}
        </List>
      </CardContent>
      <CardActions sx={{ p: 3, pt: 0 }}>
        <Button
          fullWidth
          component={Link}
          to={`/primeiro-acesso?planId=${plano.planoId}`}
          variant={recomendado ? 'contained' : 'outlined'}
          aria-label={`Começar grátis com ${plano.nome}`}
          data-testid={`lp-plan-cta-${plano.planoId}`}
        >
          Começar grátis
        </Button>
      </CardActions>
    </Card>
  );
}

export function LandingPlans() {
  const planos = useQuery({
    queryKey: ['planos-publicos'],
    queryFn: ({ signal }) => listarPlanosPublicos(signal),
    staleTime: 5 * 60_000,
  });
  const [aba, setAba] = useState<'POS_PAGO' | 'PRE_PAGO' | null>(null);
  const { posPago, prePago } = agrupar(planos.data ?? []);
  const atual =
    aba && (aba === 'POS_PAGO' ? posPago.length : prePago.length)
      ? aba
      : posPago.length
        ? 'POS_PAGO'
        : 'PRE_PAGO';
  const visiveis = atual === 'POS_PAGO' ? posPago : prePago;
  const melhor = destaque(visiveis);
  return (
    <Box
      component="section"
      id="planos"
      aria-labelledby="lp-plans-title"
      sx={{ py: { xs: 7, md: 10 }, bgcolor: 'action.hover' }}
    >
      <Container maxWidth="lg">
        <Typography variant="overline" color="primary">
          Planos
        </Typography>
        <Typography variant="h2" id="lp-plans-title">
          Escolha como prefere pagar
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 2, mb: 4 }}>
          Todos os planos têm o CareAuto completo e começam com 7 dias grátis.
        </Typography>
        {planos.isPending ? (
          <Grid container spacing={3} aria-busy="true" role="status" aria-label="Carregando planos">
            {[0, 1, 2].map((i) => (
              <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
                <Skeleton variant="rounded" height={380} />
              </Grid>
            ))}
          </Grid>
        ) : planos.isError ? (
          <Alert
            severity="warning"
            data-testid="lp-plans-error"
            action={
              <Button color="inherit" onClick={() => void planos.refetch()}>
                Tentar novamente
              </Button>
            }
          >
            Não foi possível carregar os planos. Tente novamente para conferir os valores
            atualizados.
          </Alert>
        ) : !planos.data.length ? (
          <Card variant="outlined" data-testid="lp-plans-fallback">
            <CardContent>
              <Typography variant="h3" sx={{ mb: 2 }}>
                Novos planos em breve
              </Typography>
              <Typography color="text.secondary">
                Os planos ainda não foram publicados. Você pode criar sua conta para conhecer o
                sistema durante o teste grátis.
              </Typography>
            </CardContent>
            <CardActions sx={{ p: 3, pt: 0 }}>
              <Button component={Link} to="/primeiro-acesso" variant="contained">
                Começar 7 dias grátis
              </Button>
            </CardActions>
          </Card>
        ) : (
          <>
            {posPago.length > 0 && prePago.length > 0 && (
              <Tabs
                value={atual}
                onChange={(_, value: 'POS_PAGO' | 'PRE_PAGO') => setAba(value)}
                aria-label="Modalidade de pagamento"
                sx={{ mb: 3 }}
              >
                <Tab
                  value="POS_PAGO"
                  id="plan-tab-POS_PAGO"
                  aria-controls="plan-panel"
                  label="Pós-pago"
                  data-testid="lp-tab-POS_PAGO"
                />
                <Tab
                  value="PRE_PAGO"
                  id="plan-tab-PRE_PAGO"
                  aria-controls="plan-panel"
                  label="Pré-pago · à vista"
                  data-testid="lp-tab-PRE_PAGO"
                />
              </Tabs>
            )}
            <Box
              role={posPago.length && prePago.length ? 'tabpanel' : undefined}
              id="plan-panel"
              aria-labelledby={posPago.length && prePago.length ? `plan-tab-${atual}` : undefined}
            >
              <Grid container spacing={3} data-testid="lp-plans">
                {visiveis.map((p) => (
                  <Grid key={p.planoId} size={{ xs: 12, sm: 6, lg: 4 }}>
                    <PlanCard plano={p} recomendado={p.planoId === melhor} />
                  </Grid>
                ))}
              </Grid>
            </Box>
          </>
        )}
      </Container>
    </Box>
  );
}
