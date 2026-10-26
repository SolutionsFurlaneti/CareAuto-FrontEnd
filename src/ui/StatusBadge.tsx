export function StatusBadge({ status, label }: { status: string; label: string }) {
  return (
    <span
      className={'status-badge status-' + status.toLowerCase()}
      data-testid={'status-' + status}
    >
      <span aria-hidden="true" />
      {label}
    </span>
  );
}
