import Swal from 'sweetalert2';
import { translate as t } from '../i18n';
export async function confirmAction(title: string, text: string, confirmButtonText = 'Confirmar') {
  const result = await Swal.fire({
    title: t(title),
    text: t(text),
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: t(confirmButtonText),
    cancelButtonText: t('Voltar'),
    reverseButtons: true,
    focusCancel: true,
    customClass: { popup: 'confirm-popup' },
  });
  return result.isConfirmed;
}

export async function alertAction(title: string, text: string) {
  await Swal.fire({
    title: t(title),
    text: t(text),
    icon: 'warning',
    confirmButtonText: t('Entendi'),
    customClass: { popup: 'confirm-popup' },
  });
}
