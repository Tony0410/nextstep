import { prisma } from './prisma'
import type { WorkspaceRole } from '@prisma/client'

export async function checkWorkspaceAccess(
  workspaceId: string,
  userId: string,
  requiredRoles: WorkspaceRole[] = ['OWNER', 'EDITOR', 'VIEWER']
): Promise<{ role: WorkspaceRole } | null> {
  const member = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: { workspaceId, userId },
    },
  })

  if (!member || !requiredRoles.includes(member.role)) {
    return null
  }

  return { role: member.role }
}

export function canEdit(role: WorkspaceRole): boolean {
  return role === 'OWNER' || role === 'EDITOR'
}
