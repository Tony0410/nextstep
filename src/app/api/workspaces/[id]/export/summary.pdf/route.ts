import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { checkWorkspaceAccess } from '@/lib/db/workspace-access'
import { withAuth, type AuthenticatedRequest } from '@/lib/auth'
import { generateMedicalSummaryPDF } from '@/lib/export/pdf-generator'

// GET /api/workspaces/[id]/export/summary.pdf - Generate PDF summary
export const GET = withAuth(async (req: AuthenticatedRequest, { params }: { params: Promise<Record<string, string>> }) => {
  try {
    const { id: workspaceId } = await params

    const access = await checkWorkspaceAccess(workspaceId, req.session.user.id)
    if (!access) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Fetch all data
    const [workspace, medications, appointments, symptoms] = await Promise.all([
      prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: {
          name: true,
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
      }),
      prisma.medication.findMany({
        where: { workspaceId, deletedAt: null },
        orderBy: { name: 'asc' },
      }),
      prisma.appointment.findMany({
        where: { workspaceId, deletedAt: null },
        orderBy: { datetime: 'asc' },
      }),
      prisma.symptom.findMany({
        where: { workspaceId, deletedAt: null },
        orderBy: { recordedAt: 'desc' },
        take: 100, // Last 100 symptoms
      }),
    ])

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    // Generate PDF
    const doc = generateMedicalSummaryPDF({
      patient: workspace,
      medications: medications.map((m) => ({
        id: m.id,
        name: m.name,
        instructions: m.instructions,
        scheduleType: m.scheduleType,
        active: m.active,
      })),
      appointments: appointments.map((a) => ({
        id: a.id,
        title: a.title,
        datetime: a.datetime,
        location: a.location,
        notes: a.notes,
      })),
      symptoms: symptoms.map((s) => ({
        id: s.id,
        type: s.type,
        customName: s.customName,
        severity: s.severity,
        notes: s.notes,
        recordedAt: s.recordedAt,
      })),
      generatedAt: new Date(),
    })

    // Convert PDF to buffer
    const chunks: Buffer[] = []
    doc.on('data', (chunk) => chunks.push(chunk))

    await new Promise<void>((resolve, reject) => {
      doc.on('end', () => resolve())
      doc.on('error', (err) => reject(err))
      doc.end()
    })

    const pdfBuffer = Buffer.concat(chunks)

    const filename = `${workspace.patientName || workspace.name || 'medical'}-summary-${new Date().toISOString().split('T')[0]}.pdf`

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdfBuffer.length),
      },
    })
  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
})
