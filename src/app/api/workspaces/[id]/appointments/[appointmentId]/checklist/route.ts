import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { checkWorkspaceAccess } from '@/lib/db/workspace-access'
import { withAuth, type AuthenticatedRequest } from '@/lib/auth'

// GET /api/workspaces/[id]/appointments/[appointmentId]/checklist
export const GET = withAuth(
  async (
    req: AuthenticatedRequest,
    { params }: { params: Promise<Record<string, string>> }
  ) => {
    try {
      const { id: workspaceId, appointmentId } = await params

      const access = await checkWorkspaceAccess(workspaceId, req.session.user.id)
      if (!access) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }

      // Verify appointment exists
      const appointment = await prisma.appointment.findFirst({
        where: { id: appointmentId, workspaceId, deletedAt: null },
      })

      if (!appointment) {
        return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
      }

      // Fetch checklist items
      const checklists = await prisma.appointmentChecklist.findMany({
        where: { workspaceId, appointmentId },
      })

      // Convert to a map of { itemId: isReady }
      const checkedItems: Record<string, boolean> = {}
      for (const item of checklists) {
        checkedItems[item.item] = item.isReady
      }

      return NextResponse.json({
        checkedItems,
        customItems: [], // Future: support custom items
      })
    } catch (error) {
      console.error('Checklist get error:', error)
      return NextResponse.json({ error: 'Failed to get checklist' }, { status: 500 })
    }
  }
)

// POST /api/workspaces/[id]/appointments/[appointmentId]/checklist
export const POST = withAuth(
  async (
    req: AuthenticatedRequest,
    { params }: { params: Promise<Record<string, string>> }
  ) => {
    try {
      const { id: workspaceId, appointmentId } = await params
      const body = await req.json()
      const { checkedItems } = body as { checkedItems: Record<string, boolean> }

      const access = await checkWorkspaceAccess(workspaceId, req.session.user.id, [
        'OWNER',
        'EDITOR',
      ])
      if (!access) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }

      // Verify appointment exists
      const appointment = await prisma.appointment.findFirst({
        where: { id: appointmentId, workspaceId, deletedAt: null },
      })

      if (!appointment) {
        return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
      }

      // Upsert each checklist item
      for (const [itemId, isReady] of Object.entries(checkedItems)) {
        await prisma.appointmentChecklist.upsert({
          where: {
            workspaceId_appointmentId_item: {
              workspaceId,
              appointmentId,
              item: itemId,
            },
          },
          create: {
            workspaceId,
            appointmentId,
            item: itemId,
            isReady: isReady as boolean,
          },
          update: {
            isReady: isReady as boolean,
          },
        })
      }

      return NextResponse.json({ success: true })
    } catch (error) {
      console.error('Checklist save error:', error)
      return NextResponse.json({ error: 'Failed to save checklist' }, { status: 500 })
    }
  }
)
