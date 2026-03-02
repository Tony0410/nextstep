import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { checkWorkspaceAccess } from '@/lib/db/workspace-access'
import { withAuth, type AuthenticatedRequest } from '@/lib/auth'

interface StoredMarker {
  marker: string
  value: number
  unit: string
  refMin: number | null
  refMax: number | null
  flag: string | null
}

export const GET = withAuth(async (
  req: AuthenticatedRequest,
  { params }: { params: Promise<Record<string, string>> }
) => {
  try {
    const { id: workspaceId } = await params
    const access = await checkWorkspaceAccess(workspaceId, req.session.user.id)
    if (!access) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const markerName = searchParams.get('marker')
    if (!markerName) return NextResponse.json({ error: 'marker query param required' }, { status: 400 })

    // Fetch all lab results with this marker
    const labResults = await prisma.labResult.findMany({
      where: { workspaceId, deletedAt: null },
      orderBy: { testDate: 'asc' },
      select: { testDate: true, results: true },
    })

    // Extract the specific marker from each result
    const trendData: Array<{
      date: string
      value: number
      unit: string
      refMin: number | null
      refMax: number | null
    }> = []

    for (const lr of labResults) {
      const markers = lr.results as unknown as StoredMarker[]
      if (!Array.isArray(markers)) continue
      const found = markers.find(
        (m) => m.marker.toLowerCase() === markerName.toLowerCase()
      )
      if (found) {
        trendData.push({
          date: lr.testDate.toISOString(),
          value: found.value,
          unit: found.unit,
          refMin: found.refMin ?? null,
          refMax: found.refMax ?? null,
        })
      }
    }

    return NextResponse.json({ marker: markerName, trendData })
  } catch (error) {
    console.error('Lab result trends error:', error)
    return NextResponse.json({ error: 'Failed to fetch trends' }, { status: 500 })
  }
})
