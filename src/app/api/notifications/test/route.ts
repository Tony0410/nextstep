import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { withAuth, type AuthenticatedRequest } from '@/lib/auth'
import { checkWorkspaceAccess } from '@/lib/db/workspace-access'
import { sendPushNotification } from '@/lib/notifications/push'

// POST /api/notifications/test - Send a test notification
export const POST = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const body = await req.json()
    const { workspaceId } = body

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })
    }

    // Check access
    const access = await checkWorkspaceAccess(workspaceId, req.session.user.id)
    if (!access) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get push subscriptions for this user in this workspace
    const subscriptions = await prisma.pushSubscription.findMany({
      where: {
        userId: req.session.user.id,
        workspaceId,
      },
    })

    if (subscriptions.length === 0) {
      return NextResponse.json(
        { error: 'No push subscriptions found. Please enable notifications first.' },
        { status: 404 }
      )
    }

    let sent = 0
    let failed = 0
    const errors: string[] = []

    for (const sub of subscriptions) {
      try {
        const success = await sendPushNotification(
          {
            endpoint: sub.endpoint,
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
          {
            title: 'Test Notification',
            body: 'If you see this, notifications are working!',
            tag: 'test-notification',
            data: {
              url: '/settings/notifications',
              action: 'test',
            },
          }
        )

        if (success) {
          sent++
        } else {
          // Subscription expired, remove it
          await prisma.pushSubscription.delete({ where: { id: sub.id } })
          failed++
          errors.push('Subscription expired and was removed')
        }
      } catch (error: any) {
        console.error('Test notification error:', error)
        failed++
        errors.push(error.message || 'Unknown error')
      }
    }

    return NextResponse.json({
      success: sent > 0,
      sent,
      failed,
      total: subscriptions.length,
      errors: errors.length > 0 ? errors : undefined,
      message: sent > 0
        ? `Test notification sent! Check your device.`
        : `Failed to send notification: ${errors.join(', ')}`,
    })
  } catch (error) {
    console.error('Test notification error:', error)
    return NextResponse.json(
      { error: 'Failed to send test notification' },
      { status: 500 }
    )
  }
})
