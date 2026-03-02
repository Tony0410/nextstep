'use client'

import { format, isPast, addDays } from 'date-fns'
import { FileText, Image as ImageIcon, File } from 'lucide-react'

interface DocumentData {
  id: string
  title: string
  category: string
  fileName: string
  fileSize: number
  mimeType: string
  dateTaken: string | null
  expiryDate: string | null
  notes: string | null
  createdAt: string
}

interface DocumentCardProps {
  document: DocumentData
  onView: (doc: DocumentData) => void
}

const CATEGORY_BADGES: Record<string, string> = {
  LAB_REPORT: 'bg-blue-100 text-blue-700',
  SCAN: 'bg-purple-100 text-purple-700',
  INSURANCE: 'bg-green-100 text-green-700',
  ID_CARD: 'bg-orange-100 text-orange-700',
  PRESCRIPTION: 'bg-pink-100 text-pink-700',
  OTHER: 'bg-secondary-100 text-secondary-700',
}

const CATEGORY_LABELS: Record<string, string> = {
  LAB_REPORT: 'Lab Report',
  SCAN: 'Scan',
  INSURANCE: 'Insurance',
  ID_CARD: 'ID Card',
  PRESCRIPTION: 'Prescription',
  OTHER: 'Other',
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType === 'application/pdf') return <FileText className="w-6 h-6 text-red-500" />
  if (mimeType.startsWith('image/')) return <ImageIcon className="w-6 h-6 text-blue-500" />
  return <File className="w-6 h-6 text-secondary-500" />
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function DocumentCard({ document: doc, onView }: DocumentCardProps) {
  const badge = CATEGORY_BADGES[doc.category] || CATEGORY_BADGES.OTHER
  const label = CATEGORY_LABELS[doc.category] || doc.category
  const isExpiringSoon = doc.expiryDate && !isPast(new Date(doc.expiryDate)) &&
    isPast(addDays(new Date(), -30))
  const isExpired = doc.expiryDate && isPast(new Date(doc.expiryDate))

  return (
    <div
      onClick={() => onView(doc)}
      className="bg-surface rounded-card border border-border p-4 cursor-pointer hover:shadow-card-hover transition-shadow"
    >
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
          <FileIcon mimeType={doc.mimeType} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-secondary-900 truncate">{doc.title}</h3>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge}`}>
              {label}
            </span>
            <span className="text-xs text-secondary-400">
              {formatFileSize(doc.fileSize)}
            </span>
            {doc.dateTaken && (
              <span className="text-xs text-secondary-500">
                {format(new Date(doc.dateTaken), 'MMM d, yyyy')}
              </span>
            )}
          </div>
          {/* Expiry indicators */}
          {isExpired && (
            <span className="inline-block mt-1.5 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
              Expired
            </span>
          )}
          {isExpiringSoon && !isExpired && (
            <span className="inline-block mt-1.5 text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
              Expiring soon
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
