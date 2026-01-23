import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { checkWorkspaceAccess } from '@/lib/db/workspace-access'
import { withAuth, type AuthenticatedRequest } from '@/lib/auth'

const refillAmountSchema = z.object({
  amount: z.number().min(1, 'Amount must be at least 1'),
})

// POST /api/workspaces/[id]/medications/[medicationId]/refill
export const POST = withAuth(async (
  req: AuthenticatedRequest,
  { params }: { params: Promise<Record<string, string>> }
) => {
  try {
    const { id: workspaceId, medicationId } = await params
    const body = await req.json()

    const access = await checkWorkspaceAccess(workspaceId, req.session.user.id, ['OWNER', 'EDITOR'])
    if (!access) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const result = refillAmountSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { amount } = result.data

    // Get current medication
    const medication = await prisma.medication.findFirst({
      where: {
        id: medicationId,
        workspaceId,
        deletedAt: null,
      },
    })

    if (!medication) {
      return NextResponse.json({ error: 'Medication not found' }, { status: 404 })
    }

    // Update pill count
    const newPillCount = (medication.pillCount ?? 0) + amount
    const updated = await prisma.medication.update({
      where: { id: medicationId },
      data: {
        pillCount: newPillCount,
        lastRefillDate: new Date(),
        version: { increment: 1 },
        syncedAt: new Date(),
        updatedById: req.session.user.id,
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        workspaceId,
        userId: req.session.user.id,
        action: 'REFILL',
        entityType: 'MEDICATION',
        entityId: medicationId,
        details: {
          amount,
          previousCount: medication.pillCount,
          newCount: newPillCount,
        },
      },
    })

    return NextResponse.json({
      id: updated.id,
      pillCount: updated.pillCount,
      lastRefillDate: updated.lastRefillDate,
    })
  } catch (error) {
    console.error('Refill error:', error)
    return NextResponse.json({ error: 'Failed to record refill' }, { status: 500 })
  }
})
