import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { checkWorkspaceAccess } from '@/lib/db/workspace-access'
import { withAuth, type AuthenticatedRequest } from '@/lib/auth'
import { checkInteractions } from '@/lib/interactions/checker'

export const POST = withAuth(async (
  req: AuthenticatedRequest,
  { params }: { params: Promise<Record<string, string>> }
) => {
  try {
    const { id: workspaceId } = await params
    const access = await checkWorkspaceAccess(workspaceId, req.session.user.id)
    if (!access) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

    // Get all active medications for this workspace
    const medications = await prisma.medication.findMany({
      where: { workspaceId, active: true, deletedAt: null },
      select: { id: true, name: true },
    })

    if (medications.length < 2) {
      return NextResponse.json({
        interactions: [],
        message: 'Need at least 2 active medications to check for interactions.',
        medicationCount: medications.length,
      })
    }

    const medNames = medications.map((m) => m.name)
    const interactions = checkInteractions(medNames)

    // Cache results in DB for quick retrieval
    // Clear old interactions for this workspace first
    await prisma.drugInteraction.deleteMany({ where: { workspaceId } })

    // Save new interactions
    if (interactions.length > 0) {
      // Map drug names back to medication IDs
      const nameToId = new Map(medications.map((m) => [m.name.toLowerCase(), m.id]))

      for (const interaction of interactions) {
        const med1Id = nameToId.get(interaction.drug1Name.toLowerCase())
        const med2Id = nameToId.get(interaction.drug2Name.toLowerCase())
        if (med1Id && med2Id) {
          await prisma.drugInteraction.create({
            data: {
              workspaceId,
              medication1Id: med1Id,
              medication2Id: med2Id,
              severity: interaction.severity,
              description: interaction.description,
            },
          }).catch(() => {
            // Ignore duplicate key errors
          })
        }
      }
    }

    await prisma.auditLog.create({
      data: {
        workspaceId, userId: req.session.user.id,
        action: 'CREATE', entityType: 'DRUG_INTERACTION', entityId: workspaceId,
        details: { medicationCount: medications.length, interactionsFound: interactions.length },
      },
    })

    return NextResponse.json({
      interactions,
      medicationCount: medications.length,
      checkedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Check interactions error:', error)
    return NextResponse.json({ error: 'Failed to check interactions' }, { status: 500 })
  }
})
