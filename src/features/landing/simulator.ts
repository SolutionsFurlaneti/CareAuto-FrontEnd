export interface SimulationInputs {
  vehiclesPerDay: number;
  workingDays: number;
  servicePercent: number;
  servicePrice: number;
  minutesPerVehicle: number;
  hourlyCost: number;
}

export const simulationLimits = {
  vehiclesPerDay: { min: 0, max: 10000, integer: true },
  workingDays: { min: 1, max: 31, integer: true },
  servicePercent: { min: 0, max: 100, integer: false },
  servicePrice: { min: 0, max: 100000, integer: false },
  minutesPerVehicle: { min: 0, max: 60, integer: false },
  hourlyCost: { min: 0, max: 10000, integer: false },
} as const;

export const defaultSimulationInputs: SimulationInputs = {
  vehiclesPerDay: 40,
  workingDays: 26,
  servicePercent: 10,
  servicePrice: 35,
  minutesPerVehicle: 1,
  hourlyCost: 20,
};

/** Bounded assumptions keep calculations finite even for malformed external inputs. */
export function calculateSimulation(inputs: SimulationInputs) {
  function bounded(key: keyof SimulationInputs) {
    const { min, max, integer } = simulationLimits[key];
    const value = Number.isFinite(inputs[key]) ? inputs[key] : min;
    const clamped = Math.min(max, Math.max(min, value));
    return integer ? Math.floor(clamped) : clamped;
  }

  const monthlyVehicles = bounded('vehiclesPerDay') * bounded('workingDays');
  // A service belongs to a whole vehicle, so partial conversions are rounded down.
  const monthlyServices = Math.floor((monthlyVehicles * bounded('servicePercent')) / 100);
  const serviceRevenue = Math.round(monthlyServices * bounded('servicePrice') * 100) / 100;
  const hoursAvailable = (monthlyVehicles * bounded('minutesPerVehicle')) / 60;
  const timeValue = Math.round(hoursAvailable * bounded('hourlyCost') * 100) / 100;

  return { monthlyVehicles, monthlyServices, serviceRevenue, hoursAvailable, timeValue };
}
