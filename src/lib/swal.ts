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
