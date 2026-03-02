import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { checkWorkspaceAccess, canEdit } from '@/lib/db/workspace-access'
import { withAuth, type AuthenticatedRequest } from '@/lib/auth'
import { contactSchema } from '@/lib/validation'

export const GET = withAuth(async (
  req: AuthenticatedRequest,
  { params }: { params: Promise<Record<string, string>> }
) => {
  try {
    const { id: workspaceId } = await params
    const access = await checkWorkspaceAccess(workspaceId, req.session.user.id)
    if (!access) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')

    const where: Record<string, unknown> = { workspaceId, deletedAt: null }
    if (category) where.category = category

    const contacts = await prisma.contact.findMany({
      where,
      orderBy: [{ isEmergency: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        createdBy: { select: { id: true, name: true } },
        updatedBy: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ contacts })
  } catch (error) {
    console.error('List contacts error:', error)
    return NextResponse.json({ error: 'Failed to list contacts' }, { status: 500 })
  }
})

export const POST = withAuth(async (
  req: AuthenticatedRequest,
  { params }: { params: Promise<Record<string, string>> }
) => {
  try {
    const { id: workspaceId } = await params
    const access = await checkWorkspaceAccess(workspaceId, req.session.user.id)
    if (!access || !canEdit(access.role)) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

    const body = await req.json()
    const result = contactSchema.safeParse(body)
    if (!result.success) return NextResponse.json({ error: 'Invalid input', details: result.error.flatten() }, { status: 400 })

    const contact = await prisma.contact.create({
      data: {
        workspaceId,
        name: result.data.name,
        role: result.data.role,
        category: result.data.category,
        phone: result.data.phone,
        phone2: result.data.phone2 || null,
        email: result.data.email || null,
        address: result.data.address || null,
        hours: result.data.hours || null,
        notes: result.data.notes || null,
        isEmergency: result.data.isEmergency,
        sortOrder: result.data.sortOrder,
        createdById: req.session.user.id,
        updatedById: req.session.user.id,
      },
      include: {
        createdBy: { select: { id: true, name: true } },
        updatedBy: { select: { id: true, name: true } },
      },
    })

    await prisma.auditLog.create({
      data: {
        workspaceId, userId: req.session.user.id,
        action: 'CREATE', entityType: 'CONTACT', entityId: contact.id,
        details: { name: contact.name, category: contact.category },
      },
    })

    return NextResponse.json({ contact }, { status: 201 })
  } catch (error) {
    console.error('Create contact error:', error)
    return NextResponse.json({ error: 'Failed to create contact' }, { status: 500 })
  }
})
