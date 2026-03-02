'use client'

import { X, Download, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui'

interface DocumentViewerProps {
  isOpen: boolean
  onClose: () => void
  onDelete?: () => void
  document: {
    id: string
    title: string
    mimeType: string
    fileName: string
  } | null
  workspaceId: string
}

export function DocumentViewer({ isOpen, onClose, onDelete, document: doc, workspaceId }: DocumentViewerProps) {
  if (!isOpen || !doc) return null

  const fileUrl = `/api/workspaces/${workspaceId}/documents/${doc.id}`
  const isImage = doc.mimeType.startsWith('image/')
  const isPDF = doc.mimeType === 'application/pdf'

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/50">
        <h2 className="text-white font-semibold truncate flex-1 mr-4">{doc.title}</h2>
        <div className="flex items-center gap-2">
          <a
            href={fileUrl}
            download={doc.fileName}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            <Download className="w-5 h-5 text-white" />
          </a>
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-2 rounded-lg bg-white/10 hover:bg-red-500/50 transition-colors"
            >
              <Trash2 className="w-5 h-5 text-white" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4">
        {isImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={fileUrl}
            alt={doc.title}
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        )}
        {isPDF && (
          <iframe
            src={fileUrl}
            title={doc.title}
            className="w-full h-full rounded-lg bg-white"
          />
        )}
        {!isImage && !isPDF && (
          <div className="text-center text-white">
            <p className="text-lg mb-4">Preview not available</p>
            <Button variant="secondary" onClick={() => window.open(fileUrl, '_blank')}>
              Download File
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
