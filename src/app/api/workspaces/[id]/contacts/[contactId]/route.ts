import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { checkWorkspaceAccess, canEdit } from '@/lib/db/workspace-access'
import { withAuth, type AuthenticatedRequest } from '@/lib/auth'
import { contactSchema } from '@/lib/validation'

export const PATCH = withAuth(async (
  req: AuthenticatedRequest,
  { params }: { params: Promise<Record<string, string>> }
) => {
  try {
    const { id: workspaceId, contactId } = await params
    const access = await checkWorkspaceAccess(workspaceId, req.session.user.id)
    if (!access || !canEdit(access.role)) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

    const existing = await prisma.contact.findFirst({ where: { id: contactId, workspaceId, deletedAt: null } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = await req.json()
    const result = contactSchema.partial().safeParse(body)
    if (!result.success) return NextResponse.json({ error: 'Invalid input', details: result.error.flatten() }, { status: 400 })

    const contact = await prisma.contact.update({
      where: { id: contactId },
      data: { ...result.data, updatedById: req.session.user.id },
      include: {
        createdBy: { select: { id: true, name: true } },
        updatedBy: { select: { id: true, name: true } },
      },
    })

    await prisma.auditLog.create({
      data: {
        workspaceId, userId: req.session.user.id,
        action: 'UPDATE', entityType: 'CONTACT', entityId: contactId,
        details: result.data,
      },
    })

    return NextResponse.json({ contact })
  } catch (error) {
    console.error('Update contact error:', error)
    return NextResponse.json({ error: 'Failed to update contact' }, { status: 500 })
  }
})

export const DELETE = withAuth(async (
  req: AuthenticatedRequest,
  { params }: { params: Promise<Record<string, string>> }
) => {
  try {
    const { id: workspaceId, contactId } = await params
    const access = await checkWorkspaceAccess(workspaceId, req.session.user.id)
    if (!access || !canEdit(access.role)) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

    const existing = await prisma.contact.findFirst({ where: { id: contactId, workspaceId, deletedAt: null } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await prisma.contact.update({ where: { id: contactId }, data: { deletedAt: new Date() } })

    await prisma.auditLog.create({
      data: {
        workspaceId, userId: req.session.user.id,
        action: 'DELETE', entityType: 'CONTACT', entityId: contactId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete contact error:', error)
    return NextResponse.json({ error: 'Failed to delete contact' }, { status: 500 })
  }
})
