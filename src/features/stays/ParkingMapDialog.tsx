import { useEffect, useState } from 'react';
import { CarFront, Check, MapPinned } from 'lucide-react';
import type { Estadia, Veiculo } from '../../lib/types';
import { Button, Modal } from '../../ui';

type ParkingMapDialogProps = {
  open: boolean;
  stays: Estadia[];
  vehicles: Veiculo[];
  onClose: () => void;
  onRegisterEntry: () => void;
  onSelectStay: (stayId: number) => void;
};

export function ParkingMapDialog({
  open,
  stays,
  vehicles,
  onClose,
  onRegisterEntry,
  onSelectStay,
}: ParkingMapDialogProps) {
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const activeStays = stays
    .filter((stay) => stay.status === 'EM_ANDAMENTO')
    .sort((a, b) => a.estadiaId - b.estadiaId);
  const byVehicle = new Map(vehicles.map((vehicle) => [vehicle.veiculoId, vehicle]));
  const assignedVisuals = activeStays.slice(0, 30);
  const selectedStay = selectedSlot === null ? undefined : assignedVisuals[selectedSlot - 1];

  useEffect(() => {
    if (!open) setSelectedSlot(null);
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Mapa do Estacionamento"
      size="md"
      actions={
        <div className="parking-map-actions">
          <span className="parking-map-legend" aria-label="Resumo das vagas">
            <span>
              <i className="is-occupied" /> Ocupada ({assignedVisuals.length})
            </span>
            <span>
              <i /> Livre ({30 - assignedVisuals.length})
            </span>
          </span>
          {selectedSlot !== null && !selectedStay && (
            <Button data-testid="map-register-entry" onClick={onRegisterEntry}>
              Registrar entrada
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>
            Fechar
          </Button>
        </div>
      }
    >
      <div className="parking-map-heading">
        <span className="parking-map-icon">
          <MapPinned size={18} />
        </span>
        <div>
          <strong>{assignedVisuals.length} de 30 vagas ocupadas</strong>
          <span>Toque em uma vaga para ver o detalhe ou iniciar uma entrada.</span>
        </div>
      </div>
      <div className="parking-map-grid" aria-label="Representação visual das 30 vagas">
        {Array.from({ length: 30 }, (_, index) => {
          const stay = assignedVisuals[index];
          const vehicle = stay ? byVehicle.get(stay.veiculoId) : undefined;
          const slotNumber = index + 1;
          return (
            <button
              key={slotNumber}
              type="button"
              className={`parking-map-slot${stay ? ' occupied' : ''}${selectedSlot === slotNumber ? ' selected' : ''}`}
              aria-label={
                stay
                  ? `Vaga visual ${slotNumber}, ocupada pelo veículo ${vehicle?.placa || 'sem placa cadastrada'}`
                  : `Vaga visual ${slotNumber}, livre`
              }
              aria-pressed={selectedSlot === slotNumber}
              onClick={() => {
                setSelectedSlot(slotNumber);
                if (stay) {
                  onClose();
                  onSelectStay(stay.estadiaId);
                }
              }}
            >
              <span className="parking-map-number">{String(slotNumber).padStart(2, '0')}</span>
              {stay ? (
                <>
                  <CarFront size={15} aria-hidden="true" />
                  <strong>{vehicle?.placa || `#${stay.veiculoId}`}</strong>
                </>
              ) : (
                <>
                  <span aria-hidden="true">·</span>
                  <small>Livre</small>
                </>
              )}
            </button>
          );
        })}
      </div>
      <p className="parking-map-note" role="note">
        <Check size={14} aria-hidden="true" />
        Mapa visual estimado pela quantidade de estadias abertas. A vaga individual não é salva na
        estadia.
      </p>
    </Modal>
  );
}
