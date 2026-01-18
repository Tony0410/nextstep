'use client'

import toast, { Toaster as HotToaster } from 'react-hot-toast'
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react'

export function Toaster() {
  return (
    <HotToaster
      position="bottom-center"
      containerStyle={{
        bottom: 80, // Above bottom nav
      }}
      toastOptions={{
        duration: 4000,
        style: {
          background: '#1f2631',
          color: '#fff',
          padding: '12px 16px',
          borderRadius: '12px',
          fontSize: '0.9375rem',
          maxWidth: '380px',
        },
      }}
    />
  )
}

export function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-400" />,
    error: <XCircle className="w-5 h-5 text-red-400" />,
    info: <AlertCircle className="w-5 h-5 text-blue-400" />,
  }

  toast.custom(
    (t) => (
      <div
        className={`flex items-center gap-3 px-4 py-3 bg-secondary-900 text-white rounded-card shadow-lg ${
          t.visible ? 'animate-in slide-in-from-bottom-4' : 'animate-out slide-out-to-bottom-4'
        }`}
      >
        {icons[type]}
        <span className="flex-1">{message}</span>
        <button
          onClick={() => toast.dismiss(t.id)}
          className="p-1 hover:bg-white/10 rounded-full transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    ),
    { duration: 4000 }
  )
}

export function showUndoToast(message: string, onUndo: () => void) {
  toast.custom(
    (t) => (
      <div
        className={`flex items-center gap-3 px-4 py-3 bg-secondary-900 text-white rounded-card shadow-lg ${
          t.visible ? 'animate-in slide-in-from-bottom-4' : 'animate-out slide-out-to-bottom-4'
        }`}
      >
        <CheckCircle className="w-5 h-5 text-green-400" />
        <span className="flex-1">{message}</span>
        <button
          onClick={() => {
            onUndo()
            toast.dismiss(t.id)
          }}
          className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-button text-sm font-medium transition-colors"
        >
          Undo
        </button>
      </div>
    ),
    { duration: 5000 }
  )
}
