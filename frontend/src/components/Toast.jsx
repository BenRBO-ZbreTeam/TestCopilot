import { CheckCircle, XCircle, Info } from 'lucide-react'

export default function ToastContainer({ toasts }) {
  if (toasts.length === 0) return null

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          {toast.type === 'success' && <CheckCircle size={16} />}
          {toast.type === 'error' && <XCircle size={16} />}
          {toast.type === 'info' && <Info size={16} />}
          {toast.message}
        </div>
      ))}
    </div>
  )
}
