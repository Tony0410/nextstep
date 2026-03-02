import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { checkWorkspaceAccess, canEdit } from '@/lib/db/workspace-access'
import { withAuth, type AuthenticatedRequest } from '@/lib/auth'
import { labResultSchema } from '@/lib/validation'

export const PATCH = withAuth(async (
  req: AuthenticatedRequest,
  { params }: { params: Promise<Record<string, string>> }
) => {
  try {
    const { id: workspaceId, labId } = await params
    const access = await checkWorkspaceAccess(workspaceId, req.session.user.id)
    if (!access || !canEdit(access.role)) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

    const existing = await prisma.labResult.findFirst({ where: { id: labId, workspaceId, deletedAt: null } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = await req.json()
    const result = labResultSchema.partial().safeParse(body)
    if (!result.success) return NextResponse.json({ error: 'Invalid input', details: result.error.flatten() }, { status: 400 })

    const updateData: Record<string, unknown> = { updatedById: req.session.user.id }
    if (result.data.testDate) updateData.testDate = new Date(result.data.testDate)
    if (result.data.panelName !== undefined) updateData.panelName = result.data.panelName
    if (result.data.labName !== undefined) updateData.labName = result.data.labName || null
    if (result.data.results !== undefined) updateData.results = result.data.results as any
    if (result.data.notes !== undefined) updateData.notes = result.data.notes || null

    const labResult = await prisma.labResult.update({
      where: { id: labId },
      data: updateData,
      include: {
        createdBy: { select: { id: true, name: true } },
      },
    })

    await prisma.auditLog.create({
      data: {
        workspaceId, userId: req.session.user.id,
        action: 'UPDATE', entityType: 'LAB_RESULT', entityId: labId,
        details: { panelName: labResult.panelName },
      },
    })

    return NextResponse.json({ labResult })
  } catch (error) {
    console.error('Update lab result error:', error)
    return NextResponse.json({ error: 'Failed to update lab result' }, { status: 500 })
  }
})

export const DELETE = withAuth(async (
  req: AuthenticatedRequest,
  { params }: { params: Promise<Record<string, string>> }
) => {
  try {
    const { id: workspaceId, labId } = await params
    const access = await checkWorkspaceAccess(workspaceId, req.session.user.id)
    if (!access || !canEdit(access.role)) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

    const existing = await prisma.labResult.findFirst({ where: { id: labId, workspaceId, deletedAt: null } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await prisma.labResult.update({
      where: { id: labId },
      data: { deletedAt: new Date(), updatedById: req.session.user.id },
    })

    await prisma.auditLog.create({
      data: {
        workspaceId, userId: req.session.user.id,
        action: 'DELETE', entityType: 'LAB_RESULT', entityId: labId,
        details: { panelName: existing.panelName },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete lab result error:', error)
    return NextResponse.json({ error: 'Failed to delete lab result' }, { status: 500 })
  }
})
