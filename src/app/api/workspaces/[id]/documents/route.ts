import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { checkWorkspaceAccess, canEdit } from '@/lib/db/workspace-access'
import { withAuth, type AuthenticatedRequest } from '@/lib/auth'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
const VALID_CATEGORIES = ['LAB_REPORT', 'SCAN', 'INSURANCE', 'ID_CARD', 'PRESCRIPTION', 'OTHER']

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
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)

    const where: Record<string, unknown> = { workspaceId, deletedAt: null }
    if (category && VALID_CATEGORIES.includes(category)) where.category = category

    // Return metadata only — no file data in list
    const documents = await prisma.medicalDocument.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        workspaceId: true,
        title: true,
        category: true,
        fileName: true,
        fileSize: true,
        mimeType: true,
        dateTaken: true,
        expiryDate: true,
        notes: true,
        createdAt: true,
        createdBy: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ documents })
  } catch (error) {
    console.error('List documents error:', error)
    return NextResponse.json({ error: 'Failed to list documents' }, { status: 500 })
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

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const title = formData.get('title') as string | null
    const category = formData.get('category') as string | null
    const dateTaken = formData.get('dateTaken') as string | null
    const expiryDate = formData.get('expiryDate') as string | null
    const notes = formData.get('notes') as string | null

    if (!file) return NextResponse.json({ error: 'File is required' }, { status: 400 })
    if (!title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    if (!category || !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: 'Valid category is required' }, { status: 400 })
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Only PDF, JPG, and PNG files allowed' }, { status: 400 })
    }

    // Read file into buffer
    const arrayBuffer = await file.arrayBuffer()
    const fileData = Buffer.from(arrayBuffer)

    const doc = await prisma.medicalDocument.create({
      data: {
        workspaceId,
        title: title.trim(),
        category,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        fileData,
        dateTaken: dateTaken ? new Date(dateTaken) : null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        notes: notes?.trim() || null,
        createdById: req.session.user.id,
      },
      select: {
        id: true,
        title: true,
        category: true,
        fileName: true,
        fileSize: true,
        mimeType: true,
        dateTaken: true,
        expiryDate: true,
        notes: true,
        createdAt: true,
        createdBy: { select: { id: true, name: true } },
      },
    })

    await prisma.auditLog.create({
      data: {
        workspaceId, userId: req.session.user.id,
        action: 'CREATE', entityType: 'MEDICAL_DOCUMENT', entityId: doc.id,
        details: { title: doc.title, category: doc.category, fileSize: file.size },
      },
    })

    return NextResponse.json({ document: doc }, { status: 201 })
  } catch (error) {
    console.error('Upload document error:', error)
    return NextResponse.json({ error: 'Failed to upload document' }, { status: 500 })
  }
})
