import { toast } from 'react-toastify'

export const showAlert = {
  error: (title, text) => {
    toast.error(text || title, { position: 'top-right', autoClose: 3000 })
  },
  loading: () => {},
  close: () => {},
}

export const showToast = {
  success: (message) => {
    toast.success(message, { position: 'top-right', autoClose: 3000 })
  },
  error: (message) => {
    toast.error(message, { position: 'top-right', autoClose: 3000 })
  },
}
