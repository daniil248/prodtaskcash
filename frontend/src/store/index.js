import { create } from 'zustand';
import { persist } from 'zustand/middleware';
export const useStore = create()(persist((set) => ({
    token: null,
    user: null,
    profile: null,
    tasks: [],
    completedToday: 0,
    bonuses: null,
    setAuth: (token, user) => set({ token, user }),
    setToken: (token) => set({ token }),
    setUser: (user) => set({ user }),
    setProfile: (profile) => set({ profile }),
    setTasks: (tasks, completedToday) => set({ tasks, completedToday }),
    updateTask: (task) => set((s) => ({ tasks: s.tasks.map((t) => (t.id === task.id ? task : t)) })),
    setBonuses: (bonuses) => set({ bonuses }),
    logout: () => set({ token: null, user: null, profile: null, tasks: [], bonuses: null }),
}), { name: 'taskcash', partialize: (s) => ({ token: s.token, user: s.user }) }));
