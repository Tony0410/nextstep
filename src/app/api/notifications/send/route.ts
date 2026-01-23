import { NextResponse } from 'next/server'
import { sendDueNotifications } from '@/lib/notifications/scheduler'

// This endpoint should be called by a cron job every minute
// You can set up a cron service like:
// - Vercel Cron Jobs
// - AWS EventBridge
// - A simple setInterval in a long-running process

// POST /api/notifications/send - Trigger sending due notifications
export async function POST(req: Request) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    // If CRON_SECRET is set, verify it
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { sent, failed } = await sendDueNotifications()

    return NextResponse.json({
      success: true,
      sent,
      failed,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Send notifications error:', error)
    return NextResponse.json(
      { error: 'Failed to send notifications' },
      { status: 500 }
    )
  }
}

// GET endpoint for health checks
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Notification sender is ready',
  })
}
