import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Profile, Task, Bonuses } from '../types'

interface AppState {
  token: string | null
  user: User | null
  profile: Profile | null
  tasks: Task[]
  completedToday: number
  bonuses: Bonuses | null

  setAuth: (token: string, user: User) => void
  setUser: (user: User) => void
  setProfile: (profile: Profile) => void
  setTasks: (tasks: Task[], completedToday: number) => void
  updateTask: (task: Task) => void
  setBonuses: (bonuses: Bonuses) => void
  logout: () => void
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      profile: null,
      tasks: [],
      completedToday: 0,
      bonuses: null,

      setAuth: (token, user) => set({ token, user }),
      setUser: (user) => set({ user }),
      setProfile: (profile) => set({ profile }),
      setTasks: (tasks, completedToday) => set({ tasks, completedToday }),
      updateTask: (task) =>
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === task.id ? task : t)) })),
      setBonuses: (bonuses) => set({ bonuses }),
      logout: () => set({ token: null, user: null, profile: null, tasks: [], bonuses: null }),
    }),
    { name: 'taskcash', partialize: (s) => ({ token: s.token, user: s.user }) },
  ),
)
