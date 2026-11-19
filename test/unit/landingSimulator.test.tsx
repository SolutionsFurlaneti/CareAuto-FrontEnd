import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LandingSimulator } from '../../src/features/landing/LandingSimulator';
import { calculateSimulation, defaultSimulationInputs } from '../../src/features/landing/simulator';

describe('landing simulations', () => {
  it('calculates whole services, gross revenue and the value of time from explicit assumptions', () => {
    expect(calculateSimulation(defaultSimulationInputs)).toEqual({
      monthlyVehicles: 1040,
      monthlyServices: 104,
      serviceRevenue: 3640,
      hoursAvailable: 1040 / 60,
      timeValue: 346.67,
    });
    expect(
      calculateSimulation({
        ...defaultSimulationInputs,
        vehiclesPerDay: 1,
        workingDays: 1,
        servicePercent: 50,
      }).monthlyServices,
    ).toBe(0);
    const zero = calculateSimulation({ ...defaultSimulationInputs, vehiclesPerDay: 0 });
    expect(zero.serviceRevenue).toBe(0);
    expect(zero.timeValue).toBe(0);
  });

  it('bounds malformed or excessive inputs and never returns a non-finite result', () => {
    const result = calculateSimulation({
      vehiclesPerDay: Number.POSITIVE_INFINITY,
      workingDays: 50,
      servicePercent: -10,
      servicePrice: Number.NaN,
      minutesPerVehicle: 1e300,
      hourlyCost: -1,
    });
    expect(result.monthlyVehicles).toBe(0);
    expect(Object.values(result).every(Number.isFinite)).toBe(true);
    const maximum = calculateSimulation({
      vehiclesPerDay: 1e300,
      workingDays: 1e300,
      servicePercent: 1e300,
      servicePrice: 1e300,
      minutesPerVehicle: 1e300,
      hourlyCost: 1e300,
    });
    expect(maximum.monthlyVehicles).toBe(310000);
    expect(maximum.serviceRevenue).toBe(31000000000);
    expect(maximum.timeValue).toBe(3100000000);
  });

  it('updates the result immediately from typed values and the volume slider', () => {
    render(<LandingSimulator />);
    fireEvent.change(screen.getByLabelText('Veículos por dia'), { target: { value: '20' } });
    expect(screen.getByTestId('lp-simulator-result')).toHaveTextContent(/1\.820,00/);
    const slider = screen.getByRole('slider', { name: 'Ajustar veículos por dia' });
    fireEvent.change(slider, { target: { value: '0' } });
    expect(screen.getByTestId('lp-simulator-result')).toHaveTextContent(/0,00/);
    expect(screen.getByTestId('lp-simulator-cta')).toHaveAttribute('href', '#planos');
  });

  it('hides invalid estimates until a blank or out-of-range field is corrected', () => {
    render(<LandingSimulator />);
    const volume = screen.getByLabelText('Veículos por dia');
    fireEvent.change(volume, { target: { value: '' } });
    expect(screen.getByText('Informe um valor para simular.')).toBeInTheDocument();
    expect(screen.getByTestId('lp-simulator-result')).toHaveTextContent('Ajuste os campos');
    expect(screen.getByTestId('lp-simulator-result')).not.toHaveTextContent('R$');
    fireEvent.change(volume, { target: { value: '-1' } });
    expect(screen.getByLabelText('Veículos por dia')).toHaveAttribute('aria-invalid', 'true');
    fireEvent.change(volume, { target: { value: '40' } });
    expect(screen.getByTestId('lp-simulator-result')).toHaveTextContent(/3\.640,00/);
  });

  it('switches scenarios and recalculates time without claiming cash savings', async () => {
    render(<LandingSimulator />);
    await userEvent.click(screen.getByRole('tab', { name: 'Tempo operacional' }));
    expect(screen.getByTestId('lp-simulator-result')).toHaveTextContent(/346,67/);
    fireEvent.change(screen.getByLabelText('Minutos liberados por veículo'), {
      target: { value: '2' },
    });
    expect(screen.getByTestId('lp-simulator-result')).toHaveTextContent(/693,33/);
    expect(
      screen.getByText(/Tempo disponível não representa redução automática de despesas/),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('Valor médio por serviço (R$)')).not.toBeInTheDocument();
  });
});
