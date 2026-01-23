'use client'

import { useCallback } from 'react'
import { format, parseISO } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import { HelpCircle, CheckCircle, Copy } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'

import { db, markQuestionAsked, unmarkQuestionAsked } from '@/lib/sync'
import { Card, Button, LoadingState, EmptyState, showToast } from '@/components/ui'
import { Header, PageContainer } from '@/components/layout/header'
import { useApp } from '../../provider'

const TIMEZONE = 'Australia/Perth'

export default function QuestionsPage() {
  const { currentWorkspace, refreshData } = useApp()

  const questions = useLiveQuery(
    () =>
      db.notes
        .where('workspaceId')
        .equals(currentWorkspace.id)
        .and((n) => n.type === 'QUESTION' && !n.deletedAt)
        .reverse()
        .sortBy('createdAt'),
    [currentWorkspace.id]
  )

  const unanswered = questions?.filter((q) => !q.askedAt) || []
  const answered = questions?.filter((q) => q.askedAt) || []

  const handleMarkAsked = useCallback(
    async (noteId: string) => {
      const note = questions?.find((n) => n.id === noteId)
      if (!note) return

      try {
        await markQuestionAsked(note)
        await refreshData()
        showToast('Marked as asked', 'success')
      } catch {
        showToast('Failed to update', 'error')
      }
    },
    [questions, refreshData]
  )

  const handleUnmarkAsked = useCallback(
    async (noteId: string) => {
      const note = questions?.find((n) => n.id === noteId)
      if (!note) return

      try {
        await unmarkQuestionAsked(note)
        await refreshData()
        showToast('Moved back to "To Ask"', 'success')
      } catch {
        showToast('Failed to update', 'error')
      }
    },
    [questions, refreshData]
  )

  const copyAllQuestions = () => {
    const text = unanswered.map((q) => `• ${q.content}`).join('\n')
    navigator.clipboard.writeText(text)
    showToast('Questions copied', 'success')
  }

  if (!questions) {
    return (
      <>
        <Header title="Questions" showBack backHref="/notes" />
        <PageContainer>
          <LoadingState message="Loading questions..." />
        </PageContainer>
      </>
    )
  }

  return (
    <>
      <Header title="Questions for Doctor" showBack backHref="/notes" />
      <PageContainer className="pt-4">
        {questions.length === 0 ? (
          <EmptyState
            type="notes"
            title="No questions"
            description="Add questions to ask your doctor at the next appointment."
          />
        ) : (
          <div className="space-y-6">
            {/* Unanswered */}
            {unanswered.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-secondary-600">
                    To Ask ({unanswered.length})
                  </h2>
                  <button
                    onClick={copyAllQuestions}
                    className="flex items-center gap-1 text-sm text-primary-600 font-medium"
                  >
                    <Copy className="w-4 h-4" />
                    Copy all
                  </button>
                </div>
                <div className="space-y-2">
                  {unanswered.map((note) => (
                    <Card key={note.id}>
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                          <HelpCircle className="w-5 h-5 text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-secondary-800">{note.content}</p>
                          <p className="text-xs text-secondary-400 mt-1">
                            Added{' '}
                            {format(
                              toZonedTime(parseISO(note.createdAt || ''), TIMEZONE),
                              'MMM d'
                            )}
                          </p>
                        </div>
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => handleMarkAsked(note.id)}
                        >
                          Asked
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* Answered */}
            {answered.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-secondary-400 mb-3">
                  Asked ({answered.length})
                </h2>
                <div className="space-y-2">
                  {answered.map((note) => (
                    <Card key={note.id} className="opacity-75">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-secondary-600 line-through">{note.content}</p>
                          <p className="text-xs text-secondary-400 mt-1">
                            Asked{' '}
                            {format(
                              toZonedTime(parseISO(note.askedAt || ''), TIMEZONE),
                              'MMM d'
                            )}
                          </p>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleUnmarkAsked(note.id)}
                        >
                          Undo
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </PageContainer>
    </>
  )
}
