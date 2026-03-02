'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, FolderOpen } from 'lucide-react'

import { Card, LoadingState, ConfirmModal, showToast } from '@/components/ui'
import { Header, PageContainer } from '@/components/layout/header'
import { DocumentCard } from '@/components/documents/DocumentCard'
import { DocumentUpload } from '@/components/documents/DocumentUpload'
import { DocumentViewer } from '@/components/documents/DocumentViewer'
import { useApp } from '../provider'

const CATEGORY_FILTERS = [
  { value: '', label: 'All' },
  { value: 'LAB_REPORT', label: 'Lab Reports' },
  { value: 'SCAN', label: 'Scans' },
  { value: 'INSURANCE', label: 'Insurance' },
  { value: 'PRESCRIPTION', label: 'Prescriptions' },
  { value: 'OTHER', label: 'Other' },
]

export default function DocumentsPage() {
  const { currentWorkspace, refreshData } = useApp()
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [viewDoc, setViewDoc] = useState<any>(null)
  const [category, setCategory] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchDocuments = useCallback(async () => {
    try {
      const url = `/api/workspaces/${currentWorkspace.id}/documents${category ? `?category=${category}` : ''}`
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setDocuments(data.documents)
      }
    } catch (err) {
      console.error('Failed to fetch documents:', err)
    } finally {
      setLoading(false)
    }
  }, [currentWorkspace.id, category])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  const handleSaved = () => {
    fetchDocuments()
    refreshData()
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      const response = await fetch(
        `/api/workspaces/${currentWorkspace.id}/documents/${deleteId}`,
        { method: 'DELETE' }
      )
      if (!response.ok) throw new Error('Failed to delete')
      showToast('Document deleted', 'success')
      setViewDoc(null)
      setDeleteId(null)
      fetchDocuments()
      refreshData()
    } catch {
      showToast('Failed to delete document', 'error')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <>
        <Header title="Documents" />
        <PageContainer><LoadingState message="Loading documents..." /></PageContainer>
      </>
    )
  }

  return (
    <>
      <Header
        title="Documents"
        rightAction={{
          icon: <Plus className="w-6 h-6 text-secondary-700" />,
          label: 'Upload',
          onClick: () => setShowUpload(true),
        }}
      />
      <PageContainer className="pt-4 space-y-6">
        {/* Requires internet notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700">
          Documents require an internet connection and are not available offline.
        </div>

        {/* Category filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
          {CATEGORY_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setCategory(f.value)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all min-h-touch ${
                category === f.value
                  ? 'bg-primary-500 text-white'
                  : 'bg-secondary-100 text-secondary-600'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Document list */}
        {documents.length === 0 ? (
          <Card variant="outline" className="text-center py-8">
            <FolderOpen className="w-10 h-10 text-secondary-300 mx-auto mb-3" />
            <p className="text-secondary-500">No documents yet</p>
            <p className="text-sm text-secondary-400 mt-1">
              Upload lab reports, scans, insurance cards, and more
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {documents.map((doc: any) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onView={setViewDoc}
              />
            ))}
          </div>
        )}
      </PageContainer>

      {/* Upload Modal */}
      <DocumentUpload
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        onSaved={handleSaved}
        workspaceId={currentWorkspace.id}
      />

      {/* Document Viewer */}
      <DocumentViewer
        isOpen={!!viewDoc}
        onClose={() => setViewDoc(null)}
        onDelete={() => { setDeleteId(viewDoc?.id); }}
        document={viewDoc}
        workspaceId={currentWorkspace.id}
      />

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Document"
        message="Are you sure you want to delete this document? This cannot be undone."
        confirmText="Delete"
        variant="danger"
        loading={deleting}
      />
    </>
  )
}
