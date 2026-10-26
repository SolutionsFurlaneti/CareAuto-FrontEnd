import { useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react';
import { Dialog, DialogActions, DialogContent, DialogTitle, IconButton } from '@mui/material';
import { X } from 'lucide-react';
export function Modal({
  open,
  onClose,
  title,
  children,
  actions,
  busy,
  size = 'sm',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  busy?: boolean;
  /** Largura máxima: sm para formulários, lg para telas com desenho (checklist). */
  size?: 'sm' | 'md' | 'lg';
}) {
  const id = useId();
  const [viewport, setViewport] = useState<{ height: number; top: number }>();
  useEffect(() => {
    if (!open || !window.visualViewport) return;
    const visual = window.visualViewport;
    const update = () => setViewport({ height: visual.height, top: visual.offsetTop });
    update();
    visual.addEventListener('resize', update);
    visual.addEventListener('scroll', update);
    return () => {
      visual.removeEventListener('resize', update);
      visual.removeEventListener('scroll', update);
    };
  }, [open]);
  const style = viewport
    ? ({
        '--modal-viewport-height': viewport.height + 'px',
        '--modal-viewport-top': viewport.top + 'px',
      } as CSSProperties)
    : undefined;
  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      fullWidth
      maxWidth={size}
      scroll="paper"
      aria-labelledby={id}
      data-testid="modal"
      className="app-modal"
      style={style}
    >
      <DialogTitle id={id} component="h2">
        {title}
        <IconButton
          aria-label="Fechar formulário"
          data-testid="modal-close"
          disabled={busy}
          onClick={onClose}
        >
          <X size={20} />
        </IconButton>
      </DialogTitle>
      <DialogContent>{children}</DialogContent>
      {actions && <DialogActions>{actions}</DialogActions>}
    </Dialog>
  );
}
