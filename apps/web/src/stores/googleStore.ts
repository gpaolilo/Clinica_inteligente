import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface GoogleState {
  accessToken: string | null
  setAccessToken: (token: string | null) => void
}

export const useGoogleStore = create<GoogleState>()(
  persist(
    (set) => ({
      accessToken: null,
      setAccessToken: (token) => set({ accessToken: token }),
    }),
    {
      name: 'google-storage',
    }
  )
)
