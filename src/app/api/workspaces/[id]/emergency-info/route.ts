import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { checkWorkspaceAccess } from '@/lib/db/workspace-access'
import { withAuth, type AuthenticatedRequest } from '@/lib/auth'
import { emergencyInfoSchema } from '@/lib/validation'

// GET /api/workspaces/[id]/emergency-info
export const GET = withAuth(async (
  req: AuthenticatedRequest,
  { params }: { params: Promise<Record<string, string>> }
) => {
  try {
    const { id: workspaceId } = await params

    const access = await checkWorkspaceAccess(workspaceId, req.session.user.id)
    if (!access) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        patientName: true,
        patientDOB: true,
        bloodType: true,
        allergies: true,
        medicalConditions: true,
        primaryPhysician: true,
        physicianPhone: true,
        clinicPhone: true,
        emergencyPhone: true,
      },
    })

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    // Also fetch active medications for the emergency view
    const medications = await prisma.medication.findMany({
      where: {
        workspaceId,
        active: true,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        instructions: true,
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({
      ...workspace,
      medications,
    })
  } catch (error) {
    console.error('Get emergency info error:', error)
    return NextResponse.json({ error: 'Failed to get emergency info' }, { status: 500 })
  }
})

// PATCH /api/workspaces/[id]/emergency-info
export const PATCH = withAuth(async (
  req: AuthenticatedRequest,
  { params }: { params: Promise<Record<string, string>> }
) => {
  try {
    const { id: workspaceId } = await params
    const body = await req.json()

    const access = await checkWorkspaceAccess(workspaceId, req.session.user.id, ['OWNER', 'EDITOR'])
    if (!access) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const result = emergencyInfoSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.flatten() },
        { status: 400 }
      )
    }

    const data = result.data
    const workspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        patientName: data.patientName,
        patientDOB: data.patientDOB ? new Date(data.patientDOB) : null,
        bloodType: data.bloodType,
        allergies: data.allergies,
        medicalConditions: data.medicalConditions,
        primaryPhysician: data.primaryPhysician,
        physicianPhone: data.physicianPhone,
        clinicPhone: data.clinicPhone,
        emergencyPhone: data.emergencyPhone,
      },
      select: {
        id: true,
        patientName: true,
        patientDOB: true,
        bloodType: true,
        allergies: true,
        medicalConditions: true,
        primaryPhysician: true,
        physicianPhone: true,
        clinicPhone: true,
        emergencyPhone: true,
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        workspaceId,
        userId: req.session.user.id,
        action: 'UPDATE',
        entityType: 'WORKSPACE',
        entityId: workspaceId,
        details: { updated: 'emergency_info' },
      },
    })

    return NextResponse.json(workspace)
  } catch (error) {
    console.error('Update emergency info error:', error)
    return NextResponse.json({ error: 'Failed to update emergency info' }, { status: 500 })
  }
})
