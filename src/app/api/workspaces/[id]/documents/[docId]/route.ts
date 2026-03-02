import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { checkWorkspaceAccess, canEdit } from '@/lib/db/workspace-access'
import { withAuth, type AuthenticatedRequest } from '@/lib/auth'

export const GET = withAuth(async (
  req: AuthenticatedRequest,
  { params }: { params: Promise<Record<string, string>> }
) => {
  try {
    const { id: workspaceId, docId } = await params
    const access = await checkWorkspaceAccess(workspaceId, req.session.user.id)
    if (!access) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

    const doc = await prisma.medicalDocument.findFirst({
      where: { id: docId, workspaceId, deletedAt: null },
    })
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Return the file data as a downloadable response
    const uint8 = new Uint8Array(doc.fileData)
    return new NextResponse(uint8, {
      headers: {
        'Content-Type': doc.mimeType,
        'Content-Disposition': `inline; filename="${doc.fileName}"`,
        'Content-Length': String(doc.fileSize),
      },
    })
  } catch (error) {
    console.error('Download document error:', error)
    return NextResponse.json({ error: 'Failed to download document' }, { status: 500 })
  }
})

export const DELETE = withAuth(async (
  req: AuthenticatedRequest,
  { params }: { params: Promise<Record<string, string>> }
) => {
  try {
    const { id: workspaceId, docId } = await params
    const access = await checkWorkspaceAccess(workspaceId, req.session.user.id)
    if (!access || !canEdit(access.role)) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

    const existing = await prisma.medicalDocument.findFirst({
      where: { id: docId, workspaceId, deletedAt: null },
      select: { id: true, title: true, category: true },
    })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await prisma.medicalDocument.update({
      where: { id: docId },
      data: { deletedAt: new Date() },
    })

    await prisma.auditLog.create({
      data: {
        workspaceId, userId: req.session.user.id,
        action: 'DELETE', entityType: 'MEDICAL_DOCUMENT', entityId: docId,
        details: { title: existing.title },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete document error:', error)
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 })
  }
})
