'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import {
  Plus,
  HelpCircle,
  FileText,
  CheckCircle,
  ChevronRight,
  Copy,
} from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'

import { db, createLocalNote, markQuestionAsked } from '@/lib/sync'
import { Card, Button, LoadingState, EmptyState, Modal, Textarea, showToast } from '@/components/ui'
import { Header, PageContainer } from '@/components/layout/header'
import { useApp } from '../provider'

const TIMEZONE = 'Australia/Perth'

export default function NotesPage() {
  const router = useRouter()
  const { currentWorkspace, refreshData } = useApp()
  const [showNewNote, setShowNewNote] = useState(false)
  const [noteType, setNoteType] = useState<'QUESTION' | 'GENERAL'>('GENERAL')
  const [noteContent, setNoteContent] = useState('')
  const [loading, setLoading] = useState(false)

  const notes = useLiveQuery(
    () =>
      db.notes
        .where('workspaceId')
        .equals(currentWorkspace.id)
        .and((n) => !n.deletedAt)
        .reverse()
        .sortBy('createdAt'),
    [currentWorkspace.id]
  )

  const questions = notes?.filter((n) => n.type === 'QUESTION') || []
  const generalNotes = notes?.filter((n) => n.type === 'GENERAL') || []
  const unansweredQuestions = questions.filter((q) => !q.askedAt)

  const handleAddNote = async () => {
    if (!noteContent.trim()) return

    setLoading(true)
    try {
      await createLocalNote(currentWorkspace.id, {
        type: noteType,
        content: noteContent.trim(),
      })
      await refreshData()
      setNoteContent('')
      setShowNewNote(false)
      showToast(noteType === 'QUESTION' ? 'Question added' : 'Note added', 'success')
    } catch {
      showToast('Failed to add note', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsked = useCallback(
    async (noteId: string) => {
      const note = notes?.find((n) => n.id === noteId)
      if (!note) return

      try {
        await markQuestionAsked(note)
        await refreshData()
        showToast('Marked as asked', 'success')
      } catch {
        showToast('Failed to update', 'error')
      }
    },
    [notes, refreshData]
  )

  if (!notes) {
    return (
      <>
        <Header
          title="Notes"
          rightAction={{
            icon: <Plus className="w-6 h-6 text-secondary-700" />,
            label: 'Add note',
            onClick: () => setShowNewNote(true),
          }}
        />
        <PageContainer>
          <LoadingState message="Loading notes..." />
        </PageContainer>
      </>
    )
  }

  return (
    <>
      <Header
        title="Notes"
        rightAction={{
          icon: <Plus className="w-6 h-6 text-secondary-700" />,
          label: 'Add note',
          onClick: () => setShowNewNote(true),
        }}
      />
      <PageContainer className="pt-4">
        {/* Quick links */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => router.push('/notes/questions')}
            className="flex-1 flex items-center gap-2 p-3 bg-amber-50 rounded-card border border-amber-100 hover:bg-amber-100 transition-colors"
          >
            <HelpCircle className="w-5 h-5 text-amber-600" />
            <span className="font-medium text-amber-800">
              Questions ({unansweredQuestions.length})
            </span>
          </button>
          <button
            onClick={() => {
              setNoteType('QUESTION')
              setShowNewNote(true)
            }}
            className="flex items-center gap-2 p-3 bg-primary-50 rounded-card border border-primary-100 hover:bg-primary-100 transition-colors"
          >
            <Plus className="w-5 h-5 text-primary-600" />
          </button>
        </div>

        {notes.length === 0 ? (
          <EmptyState
            type="notes"
            title="No notes yet"
            description="Add questions for your doctor or general notes."
            action={{
              label: 'Add Note',
              onClick: () => setShowNewNote(true),
            }}
          />
        ) : (
          <div className="space-y-6">
            {/* Questions for doctor */}
            {questions.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-secondary-600">
                    Questions for Doctor
                  </h2>
                  <button
                    onClick={() => router.push('/notes/questions')}
                    className="text-sm text-primary-600 font-medium"
                  >
                    View all
                  </button>
                </div>
                <div className="space-y-2">
                  {questions.slice(0, 3).map((note) => (
                    <Card key={note.id} padding="sm">
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            note.askedAt ? 'bg-green-100' : 'bg-amber-100'
                          }`}
                        >
                          {note.askedAt ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <HelpCircle className="w-4 h-4 text-amber-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-secondary-800 ${
                              note.askedAt ? 'line-through opacity-60' : ''
                            }`}
                          >
                            {note.content}
                          </p>
                        </div>
                        {!note.askedAt && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkAsked(note.id)}
                          >
                            Asked
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* General notes */}
            {generalNotes.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-secondary-600 mb-3">
                  General Notes
                </h2>
                <div className="space-y-2">
                  {generalNotes.map((note) => (
                    <Card key={note.id} padding="sm">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-secondary-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <FileText className="w-4 h-4 text-secondary-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-secondary-800">{note.content}</p>
                          <p className="text-xs text-secondary-400 mt-1">
                            {format(
                              toZonedTime(parseISO(note.createdAt || ''), TIMEZONE),
                              'MMM d, h:mm a'
                            )}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* New note modal */}
        <Modal
          isOpen={showNewNote}
          onClose={() => {
            setShowNewNote(false)
            setNoteContent('')
          }}
          title={noteType === 'QUESTION' ? 'New Question' : 'New Note'}
        >
          <div className="space-y-4">
            <div className="flex gap-2">
              <button
                onClick={() => setNoteType('GENERAL')}
                className={`flex-1 py-2 px-3 rounded-button text-sm font-medium transition-colors ${
                  noteType === 'GENERAL'
                    ? 'bg-primary-500 text-white'
                    : 'bg-muted text-secondary-600'
                }`}
              >
                General Note
              </button>
              <button
                onClick={() => setNoteType('QUESTION')}
                className={`flex-1 py-2 px-3 rounded-button text-sm font-medium transition-colors ${
                  noteType === 'QUESTION'
                    ? 'bg-amber-500 text-white'
                    : 'bg-muted text-secondary-600'
                }`}
              >
                Question
              </button>
            </div>

            <Textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder={
                noteType === 'QUESTION'
                  ? 'What do you want to ask the doctor?'
                  : 'Write your note...'
              }
              rows={4}
              autoFocus
            />

            <Button
              onClick={handleAddNote}
              fullWidth
              loading={loading}
              disabled={!noteContent.trim()}
            >
              Add {noteType === 'QUESTION' ? 'Question' : 'Note'}
            </Button>
          </div>
        </Modal>
      </PageContainer>
    </>
  )
}
