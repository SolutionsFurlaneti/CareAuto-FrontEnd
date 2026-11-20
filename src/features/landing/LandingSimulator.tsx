import { useId, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Grid,
  MenuItem,
  Paper,
  Slider,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { integer, money } from '../../lib/format';
import { translate, useI18n } from '../../i18n';
import {
  calculateSimulation,
  defaultSimulationInputs,
  simulationLimits,
  type SimulationInputs,
} from './simulator';

type SimulationField = keyof SimulationInputs;
type RawInputs = Record<SimulationField, string>;

const fieldLabels: Record<SimulationField, string> = {
  vehiclesPerDay: 'Veículos por dia',
  workingDays: 'Dias de operação por mês',
  servicePercent: 'Veículos que contratam um serviço (%)',
  servicePrice: 'Valor médio por serviço (R$)',
  minutesPerVehicle: 'Minutos liberados por veículo',
  hourlyCost: 'Valor da hora da equipe (R$)',
};

function fieldError(key: SimulationField, raw: string) {
  if (!raw.trim()) return translate('Informe um valor para simular.');
  const value = Number(raw);
  const { min, max, integer: whole } = simulationLimits[key];
  if (!Number.isFinite(value) || value < min || value > max)
    return translate('Use um valor entre {min} e {max}.', { min: integer(min), max: integer(max) });
  if (whole && !Number.isInteger(value)) return translate('Use um número inteiro.');
  return null;
}

/** Public estimates use only visitor-provided assumptions; no financial result is promised. */
export function LandingSimulator() {
  const { t, locale } = useI18n();
  const id = useId();
  const [scenario, setScenario] = useState<'services' | 'time'>('services');
  const [raw, setRaw] = useState<RawInputs>(
    () =>
      Object.fromEntries(
        Object.entries(defaultSimulationInputs).map(([key, value]) => [key, String(value)]),
      ) as RawInputs,
  );
  const visibleFields: SimulationField[] = [
    'vehiclesPerDay',
    'workingDays',
    ...(scenario === 'services'
      ? (['servicePercent', 'servicePrice'] as const)
      : (['minutesPerVehicle', 'hourlyCost'] as const)),
  ];
  const invalid = visibleFields.some((key) => fieldError(key, raw[key]));
  const values = Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [key, Number(value)]),
  ) as unknown as SimulationInputs;
  const result = calculateSimulation(values);

  function input(key: SimulationField) {
    const error = fieldError(key, raw[key]);
    const limits = simulationLimits[key];
    const days = key === 'workingDays';
    return (
      <TextField
        id={`${id}-${key}`}
        key={key}
        fullWidth
        select={days}
        type={days ? undefined : 'number'}
        label={t(fieldLabels[key])}
        value={raw[key]}
        onChange={(event) => setRaw((current) => ({ ...current, [key]: event.target.value }))}
        error={Boolean(error)}
        helperText={
          error ??
          (key === 'minutesPerVehicle'
            ? t('Sua hipótese de tempo poupado em cada atendimento.')
            : undefined)
        }
        slotProps={{
          htmlInput: {
            min: limits.min,
            max: limits.max,
            step: limits.integer ? 1 : 0.01,
            inputMode: limits.integer ? 'numeric' : 'decimal',
            'data-testid': `lp-simulator-${key}`,
          },
        }}
        sx={{ '& input, & .MuiSelect-select': { fontSize: '1rem' } }}
      >
        {days &&
          Array.from({ length: 31 }, (_, index) => (
            <MenuItem key={index + 1} value={String(index + 1)}>
              {t('{count} dias', { count: index + 1 })}
            </MenuItem>
          ))}
      </TextField>
    );
  }

  return (
    <Box
      component="section"
      id="simulador"
      aria-labelledby={`${id}-title`}
      sx={{ py: { xs: 7, md: 11 }, scrollMarginTop: '104px' }}
    >
      <Container maxWidth="lg">
        <Stack spacing={2} sx={{ mb: 4, maxWidth: 720 }}>
          <Typography variant="overline" color="primary.main" sx={{ fontWeight: 700 }}>
            {t('Simulador')}
          </Typography>
          <Typography
            id={`${id}-title`}
            variant="h2"
            sx={{
              fontSize: { xs: '2rem', md: '2.75rem' },
              fontWeight: 750,
              letterSpacing: '-.035em',
            }}
          >
            {t('Explore o potencial da sua operação')}
          </Typography>
          <Typography color="text.secondary">
            {t(
              'Ajuste os números à realidade do seu negócio. Compare uma hipótese de serviços adicionais ou de tempo disponível para a equipe.',
            )}
          </Typography>
        </Stack>
        <Paper
          elevation={0}
          sx={{ p: { xs: 2.5, md: 4 }, border: 1, borderColor: 'divider', borderRadius: 4 }}
          data-testid="lp-simulator"
        >
          <Tabs
            value={scenario}
            onChange={(_, value: 'services' | 'time') => setScenario(value)}
            aria-label={t('Cenário da simulação')}
            variant="scrollable"
            allowScrollButtonsMobile
            sx={{
              mb: 4,
              borderBottom: 1,
              borderColor: 'divider',
              '& .MuiTab-root': { textTransform: 'none', fontSize: '1rem' },
            }}
          >
            <Tab
              label={t('Serviços adicionais')}
              value="services"
              id={`${id}-services-tab`}
              aria-controls={`${id}-panel`}
              data-testid="lp-simulator-services-tab"
            />
            <Tab
              label={t('Tempo operacional')}
              value="time"
              id={`${id}-time-tab`}
              aria-controls={`${id}-panel`}
              data-testid="lp-simulator-time-tab"
            />
          </Tabs>
          <Grid
            container
            spacing={{ xs: 4, md: 6 }}
            role="tabpanel"
            id={`${id}-panel`}
            aria-labelledby={`${id}-${scenario}-tab`}
          >
            <Grid size={{ xs: 12, md: 7 }}>
              <Stack spacing={3}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>{input('vehiclesPerDay')}</Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>{input('workingDays')}</Grid>
                </Grid>
                <Box sx={{ px: 1 }}>
                  <Slider
                    aria-label={t('Ajustar veículos por dia')}
                    min={0}
                    max={Math.max(
                      300,
                      Number.isFinite(values.vehiclesPerDay)
                        ? Math.min(values.vehiclesPerDay, 10000)
                        : 300,
                    )}
                    step={1}
                    value={Math.min(
                      10000,
                      Math.max(
                        0,
                        Number.isFinite(values.vehiclesPerDay) ? values.vehiclesPerDay : 0,
                      ),
                    )}
                    onChange={(_, value) =>
                      setRaw((current) => ({ ...current, vehiclesPerDay: String(value) }))
                    }
                    valueLabelDisplay="auto"
                    data-testid="lp-simulator-volume-slider"
                  />
                  <Typography variant="body2" color="text.secondary">
                    {t('Arraste para ajustar o movimento diário.')}
                  </Typography>
                </Box>
                <Grid container spacing={2}>
                  {visibleFields.slice(2).map((key) => (
                    <Grid key={key} size={{ xs: 12, sm: 6 }}>
                      {input(key)}
                    </Grid>
                  ))}
                </Grid>
                <Typography variant="body2" color="text.secondary">
                  {t(
                    scenario === 'services'
                      ? 'Cálculo: veículos/dia × dias × percentual de adesão (arredondado para serviços inteiros) × valor por serviço.'
                      : 'Cálculo: veículos/dia × dias × minutos por veículo ÷ 60 × valor da hora.',
                  )}
                </Typography>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <Stack
                spacing={2.5}
                sx={{
                  height: '100%',
                  bgcolor: 'action.hover',
                  borderRadius: 3,
                  p: { xs: 2.5, md: 3 },
                  minWidth: 0,
                }}
              >
                <Chip
                  label={t('Cenário ilustrativo')}
                  variant="outlined"
                  sx={{ alignSelf: 'flex-start' }}
                />
                <Box aria-live="polite" aria-atomic="true" data-testid="lp-simulator-result">
                  {invalid ? (
                    <Alert severity="info">
                      {t('Ajuste os campos indicados para calcular o cenário.')}
                    </Alert>
                  ) : (
                    <Stack spacing={1}>
                      <Typography variant="body1" color="text.secondary">
                        {t(
                          scenario === 'services'
                            ? 'Receita bruta estimada por mês'
                            : 'Valor estimado do tempo por mês',
                        )}
                      </Typography>
                      <Typography
                        variant="h3"
                        component="p"
                        color="primary.main"
                        sx={{
                          fontWeight: 750,
                          fontSize: { xs: '2rem', sm: '2.5rem' },
                          overflowWrap: 'anywhere',
                          letterSpacing: '-.04em',
                        }}
                      >
                        {money(scenario === 'services' ? result.serviceRevenue : result.timeValue)}
                      </Typography>
                      <Typography color="text.secondary">
                        {scenario === 'services'
                          ? t('{services} serviços em {vehicles} atendimentos/mês.', {
                              services: integer(result.monthlyServices),
                              vehicles: integer(result.monthlyVehicles),
                            })
                          : t('{hours} horas disponíveis em {vehicles} atendimentos/mês.', {
                              hours: result.hoursAvailable.toLocaleString(locale, {
                                maximumFractionDigits: 1,
                              }),
                              vehicles: integer(result.monthlyVehicles),
                            })}
                      </Typography>
                    </Stack>
                  )}
                </Box>
                <Divider />
                <Typography variant="body2" color="text.secondary">
                  {t(
                    scenario === 'services'
                      ? 'Receita bruta não é lucro. O cenário não desconta custos, impostos, taxas ou o plano CareAuto. O sistema ajuda a registrar os serviços; a adesão depende dos seus clientes.'
                      : 'Tempo disponível não representa redução automática de despesas. A estimativa usa o tempo informado por você e não é uma medição de desempenho do CareAuto.',
                  )}
                </Typography>
                <Button
                  href="#planos"
                  variant="contained"
                  fullWidth
                  data-testid="lp-simulator-cta"
                  sx={{ mt: 'auto', textTransform: 'none', fontWeight: 700 }}
                >
                  {t('Conhecer os planos')}
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </Paper>
      </Container>
    </Box>
  );
}
