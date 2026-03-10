import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIState {
    sidebarOpen: boolean
    sidebarCollapsed: boolean
    theme: 'light' | 'dark'

    // Actions
    toggleSidebar: () => void
    setSidebarOpen: (open: boolean) => void
    toggleSidebarCollapse: () => void
    setTheme: (theme: 'light' | 'dark') => void
    toggleTheme: () => void
}

export const useUIStore = create<UIState>()(
    persist(
        (set, get) => ({
            sidebarOpen: true,
            sidebarCollapsed: false,
            theme: 'light',

            toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
            setSidebarOpen: (open) => set({ sidebarOpen: open }),
            toggleSidebarCollapse: () =>
                set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

            setTheme: (theme) => {
                document.documentElement.classList.toggle('dark', theme === 'dark')
                set({ theme })
            },

            toggleTheme: () => {
                const newTheme = get().theme === 'light' ? 'dark' : 'light'
                document.documentElement.classList.toggle('dark', newTheme === 'dark')
                set({ theme: newTheme })
            },
        }),
        {
            name: 'edara-ui',
            onRehydrateStorage: () => {
                return (state) => {
                    // Apply theme class on initial hydration from localStorage
                    if (state?.theme === 'dark') {
                        document.documentElement.classList.add('dark')
                    }
                }
            },
        }
    )
)
