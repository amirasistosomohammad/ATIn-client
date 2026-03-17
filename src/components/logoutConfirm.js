import Swal from 'sweetalert2'

const APP_NAME = 'ATIn e-Track System'

/**
 * Sign-out confirmation modal – corporate/government style with smooth open/close transitions
 * (TasDoneNa-client style). Renders in SweetAlert2 portal with custom animations.
 * @returns {Promise<boolean>} Resolves to true if user confirmed, false if cancelled.
 */
export async function showLogoutConfirm() {
  const result = await Swal.fire({
    title: 'Sign out?',
    html: `Are you sure you want to sign out? You will need to sign in again to access <strong>${APP_NAME}</strong>.`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Yes, sign out',
    cancelButtonText: 'Cancel',
    confirmButtonColor: '#0C8A3B',
    cancelButtonColor: '#6c757d',
    reverseButtons: true,
    focusCancel: false,
    customClass: {
      popup: 'logout-confirm-popup',
      title: 'logout-confirm-title',
      htmlContainer: 'logout-confirm-body',
      confirmButton: 'logout-confirm-btn',
      cancelButton: 'logout-confirm-cancel',
    },
    showClass: {
      popup: 'logout-popup-show',
      backdrop: 'logout-backdrop-show',
    },
    hideClass: {
      popup: 'logout-popup-hide',
      backdrop: 'logout-backdrop-hide',
    },
    width: 'min(90vw, 28rem)',
    padding: 'clamp(1.25rem, 4vw, 1.75rem)',
  })
  return result.isConfirmed
}
