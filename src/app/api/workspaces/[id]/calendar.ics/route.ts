import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { generateICalendar } from '@/lib/calendar/ical-generator'

// GET /api/workspaces/[id]/calendar.ics - Get iCal feed
// This endpoint uses a token-based auth for calendar subscription
export async function GET(
  req: Request,
  { params }: { params: Promise<Record<string, string>> }
) {
  try {
    const { id: workspaceId } = await params
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')

    if (!token) {
      return new NextResponse('Unauthorized - token required', { status: 401 })
    }

    // Verify the token is a valid workspace membership
    // Token format: userId (simplified for now - could be JWT in production)
    const membership = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: token,
      },
      include: {
        workspace: true,
      },
    })

    if (!membership) {
      return new NextResponse('Unauthorized - invalid token', { status: 401 })
    }

    // Fetch appointments (non-deleted, future and recent)
    const appointments = await prisma.appointment.findMany({
      where: {
        workspaceId,
        deletedAt: null,
      },
      orderBy: {
        datetime: 'asc',
      },
    })

    // Generate iCal
    const icalContent = generateICalendar(
      appointments.map((a) => ({
        id: a.id,
        title: a.title,
        datetime: a.datetime,
        location: a.location,
        notes: a.notes,
      })),
      membership.workspace.name
    )

    // Sanitize filename for HTTP headers (remove non-ASCII characters)
    const safeFilename = membership.workspace.name
      .replace(/[^\x00-\x7F]/g, '') // Remove non-ASCII
      .replace(/[<>:"/\\|?*]/g, '-') // Replace invalid filename chars
      .trim() || 'appointments'

    return new NextResponse(icalContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${safeFilename}-appointments.ics"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    console.error('iCal generation error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
