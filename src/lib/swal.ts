import Swal from 'sweetalert2';
export async function confirmAction(title: string, text: string, confirmButtonText = 'Confirmar') {
  const result = await Swal.fire({
    title,
    text,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText: 'Voltar',
    reverseButtons: true,
    focusCancel: true,
    customClass: { popup: 'confirm-popup' },
  });
  return result.isConfirmed;
}

export async function alertAction(title: string, text: string) {
  await Swal.fire({
    title,
    text,
    icon: 'warning',
    confirmButtonText: 'Entendi',
    customClass: { popup: 'confirm-popup' },
  });
}
