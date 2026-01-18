'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { startAutoSync, stopAutoSync, sync } from '@/lib/sync'

interface User {
  id: string
  email: string
  name: string
}

interface Workspace {
  id: string
  name: string
  role: string
  clinicPhone: string | null
  emergencyPhone: string | null
  largeTextMode: boolean
}

interface AppContextType {
  user: User
  workspaces: Workspace[]
  currentWorkspace: Workspace
  setCurrentWorkspaceId: (id: string) => void
  refreshData: () => Promise<void>
}

const AppContext = createContext<AppContextType | null>(null)

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within AppProvider')
  }
  return context
}

interface AppProviderProps {
  children: React.ReactNode
  user: User
  workspaces: Workspace[]
  initialWorkspaceId: string
}

export function AppProvider({
  children,
  user,
  workspaces,
  initialWorkspaceId,
}: AppProviderProps) {
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState(initialWorkspaceId)

  const currentWorkspace = workspaces.find((w) => w.id === currentWorkspaceId) || workspaces[0]

  // Start auto-sync when workspace changes
  useEffect(() => {
    if (currentWorkspaceId) {
      startAutoSync(currentWorkspaceId)
    }

    return () => {
      stopAutoSync()
    }
  }, [currentWorkspaceId])

  const refreshData = useCallback(async () => {
    if (currentWorkspaceId) {
      await sync(currentWorkspaceId)
    }
  }, [currentWorkspaceId])

  return (
    <AppContext.Provider
      value={{
        user,
        workspaces,
        currentWorkspace,
        setCurrentWorkspaceId,
        refreshData,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}
