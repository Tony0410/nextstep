import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { BottomNav } from '@/components/layout/bottom-nav'
import { AppProvider } from './provider'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  // Get user's workspaces
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: session.user.id },
    include: {
      workspace: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  // If no workspaces, user needs to create one or accept invite
  if (memberships.length === 0) {
    redirect('/onboarding')
  }

  const workspaces = memberships.map((m) => ({
    id: m.workspace.id,
    name: m.workspace.name,
    role: m.role,
    clinicPhone: m.workspace.clinicPhone,
    emergencyPhone: m.workspace.emergencyPhone,
    largeTextMode: m.workspace.largeTextMode,
  }))

  return (
    <AppProvider
      user={session.user}
      workspaces={workspaces}
      initialWorkspaceId={workspaces[0].id}
    >
      <div className={workspaces[0].largeTextMode ? 'large-text' : ''}>
        {children}
        <BottomNav />
      </div>
    </AppProvider>
  )
}
