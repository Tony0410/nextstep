import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { checkWorkspaceAccess } from '@/lib/db/workspace-access'
import { withAuth, type AuthenticatedRequest } from '@/lib/auth'
import { syncQuerySchema, syncOpsSchema } from '@/lib/validation'

// GET /api/sync - Get changes since cursor
export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const { searchParams } = new URL(req.url)
    const result = syncQuerySchema.safeParse({
      workspaceId: searchParams.get('workspaceId'),
      since: searchParams.get('since'),
    })

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { workspaceId, since = 0 } = result.data

    const access = await checkWorkspaceAccess(workspaceId, req.session.user.id)
    if (!access) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    const sinceDate = new Date(since)

    // Fetch all changed entities
    const [appointments, medications, notes, doseLogs, workspace] = await Promise.all([
      prisma.appointment.findMany({
        where: { workspaceId, syncedAt: { gt: sinceDate } },
        include: {
          createdBy: { select: { id: true, name: true } },
          updatedBy: { select: { id: true, name: true } },
        },
      }),
      prisma.medication.findMany({
        where: { workspaceId, syncedAt: { gt: sinceDate } },
        include: {
          createdBy: { select: { id: true, name: true } },
          updatedBy: { select: { id: true, name: true } },
        },
      }),
      prisma.note.findMany({
        where: { workspaceId, syncedAt: { gt: sinceDate } },
        include: {
          createdBy: { select: { id: true, name: true } },
          updatedBy: { select: { id: true, name: true } },
        },
      }),
      prisma.doseLog.findMany({
        where: { workspaceId, syncedAt: { gt: sinceDate } },
        include: {
          medication: { select: { id: true, name: true } },
          loggedBy: { select: { id: true, name: true } },
          undoneBy: { select: { id: true, name: true } },
        },
      }),
      prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: {
          id: true,
          name: true,
          clinicPhone: true,
          emergencyPhone: true,
          quietHoursStart: true,
          quietHoursEnd: true,
          largeTextMode: true,
          updatedAt: true,
        },
      }),
    ])

    // Calculate new cursor (latest syncedAt timestamp)
    let cursor = since
    const allItems = [...appointments, ...medications, ...notes, ...doseLogs]
    for (const item of allItems) {
      const itemTime = (item as { syncedAt: Date }).syncedAt.getTime()
      if (itemTime > cursor) {
        cursor = itemTime
      }
    }

    return NextResponse.json({
      workspace,
      appointments,
      medications,
      notes,
      doseLogs,
      cursor,
      hasConflicts: false, // For now, always false - client handles conflicts
    })
  } catch (error) {
    console.error('Sync get error:', error)
    return NextResponse.json(
      { error: 'Sync failed' },
      { status: 500 }
    )
  }
})

// POST /api/sync - Upload operations from client outbox
export const POST = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const body = await req.json()
    const result = syncOpsSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { workspaceId, ops } = result.data

    const access = await checkWorkspaceAccess(workspaceId, req.session.user.id, ['OWNER', 'EDITOR'])
    if (!access) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    const results: { opId: string; success: boolean; entityId?: string; error?: string }[] = []

    for (const op of ops) {
      try {
        switch (op.type) {
          case 'CREATE': {
            if (op.entityType === 'APPOINTMENT' && op.data) {
              const appt = await prisma.appointment.create({
                data: {
                  workspaceId,
                  title: op.data.title as string,
                  datetime: new Date(op.data.datetime as string),
                  location: (op.data.location as string) || null,
                  mapUrl: (op.data.mapUrl as string) || null,
                  notes: (op.data.notes as string) || null,
                  createdById: req.session.user.id,
                  updatedById: req.session.user.id,
                },
              })
              results.push({ opId: op.id, success: true, entityId: appt.id })
            } else if (op.entityType === 'NOTE' && op.data) {
              const note = await prisma.note.create({
                data: {
                  workspaceId,
                  type: op.data.type as 'QUESTION' | 'GENERAL',
                  content: op.data.content as string,
                  createdById: req.session.user.id,
                  updatedById: req.session.user.id,
                },
              })
              results.push({ opId: op.id, success: true, entityId: note.id })
            } else {
              results.push({ opId: op.id, success: false, error: 'Unsupported entity type' })
            }
            break
          }

          case 'UPDATE': {
            if (!op.entityId) {
              results.push({ opId: op.id, success: false, error: 'Missing entityId' })
              break
            }

            if (op.entityType === 'APPOINTMENT' && op.data) {
              const updateData: Record<string, unknown> = {
                updatedById: req.session.user.id,
                version: { increment: 1 },
                syncedAt: new Date(),
              }
              if (op.data.title) updateData.title = op.data.title as string
              if (op.data.datetime) updateData.datetime = new Date(op.data.datetime as string)
              if (op.data.location !== undefined) updateData.location = op.data.location as string | null
              if (op.data.mapUrl !== undefined) updateData.mapUrl = op.data.mapUrl as string | null
              if (op.data.notes !== undefined) updateData.notes = op.data.notes as string | null

              await prisma.appointment.update({
                where: { id: op.entityId },
                data: updateData,
              })
              results.push({ opId: op.id, success: true, entityId: op.entityId })
            } else if (op.entityType === 'NOTE' && op.data) {
              const updateData: Record<string, unknown> = {
                updatedById: req.session.user.id,
                version: { increment: 1 },
                syncedAt: new Date(),
              }
              if (op.data.content) updateData.content = op.data.content as string

              await prisma.note.update({
                where: { id: op.entityId },
                data: updateData,
              })
              results.push({ opId: op.id, success: true, entityId: op.entityId })
            } else {
              results.push({ opId: op.id, success: false, error: 'Unsupported entity type' })
            }
            break
          }

          case 'DELETE': {
            if (!op.entityId) {
              results.push({ opId: op.id, success: false, error: 'Missing entityId' })
              break
            }

            if (op.entityType === 'APPOINTMENT') {
              await prisma.appointment.update({
                where: { id: op.entityId },
                data: {
                  deletedAt: new Date(),
                  updatedById: req.session.user.id,
                  version: { increment: 1 },
                  syncedAt: new Date(),
                },
              })
              results.push({ opId: op.id, success: true })
            } else if (op.entityType === 'NOTE') {
              await prisma.note.update({
                where: { id: op.entityId },
                data: {
                  deletedAt: new Date(),
                  updatedById: req.session.user.id,
                  version: { increment: 1 },
                  syncedAt: new Date(),
                },
              })
              results.push({ opId: op.id, success: true })
            } else {
              results.push({ opId: op.id, success: false, error: 'Unsupported entity type' })
            }
            break
          }

          case 'TAKE_DOSE': {
            if (!op.data?.medicationId) {
              results.push({ opId: op.id, success: false, error: 'Missing medicationId' })
              break
            }

            const doseLog = await prisma.doseLog.create({
              data: {
                workspaceId,
                medicationId: op.data.medicationId as string,
                takenAt: op.data.takenAt ? new Date(op.data.takenAt as string) : new Date(),
                loggedById: req.session.user.id,
              },
            })
            results.push({ opId: op.id, success: true, entityId: doseLog.id })
            break
          }

          case 'UNDO_DOSE': {
            if (!op.entityId) {
              results.push({ opId: op.id, success: false, error: 'Missing entityId' })
              break
            }

            await prisma.doseLog.update({
              where: { id: op.entityId },
              data: {
                undoneAt: new Date(),
                undoneById: req.session.user.id,
              },
            })
            results.push({ opId: op.id, success: true })
            break
          }

          case 'MARK_ASKED': {
            if (!op.entityId) {
              results.push({ opId: op.id, success: false, error: 'Missing entityId' })
              break
            }

            await prisma.note.update({
              where: { id: op.entityId },
              data: {
                askedAt: new Date(),
                updatedById: req.session.user.id,
                version: { increment: 1 },
                syncedAt: new Date(),
              },
            })
            results.push({ opId: op.id, success: true })
            break
          }

          default:
            results.push({ opId: op.id, success: false, error: 'Unknown operation type' })
        }
      } catch (opError) {
        console.error('Op error:', opError)
        results.push({ opId: op.id, success: false, error: 'Operation failed' })
      }
    }

    // Get new cursor
    const cursor = Date.now()

    return NextResponse.json({ results, cursor })
  } catch (error) {
    console.error('Sync post error:', error)
    return NextResponse.json(
      { error: 'Sync failed' },
      { status: 500 }
    )
  }
})
