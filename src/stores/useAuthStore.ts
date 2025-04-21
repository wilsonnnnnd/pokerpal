import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { onAuthStateChanged, User } from 'firebase/auth'
import { auth } from '../firebase/config'

interface AuthUser {
    uid: string
    email: string
}

interface AuthState {
    user: AuthUser | null
    loading: boolean
    setUser: (user: AuthUser | null) => void
    setLoading: (value: boolean) => void
    listenToAuth: () => void
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            loading: true,
            setUser: (user) => set({ user }),
            setLoading: (val) => set({ loading: val }),
            listenToAuth: () => {
                set({ loading: true })
                onAuthStateChanged(auth, (firebaseUser) => {
                    if (firebaseUser) {
                        set({
                            user: {
                                uid: firebaseUser.uid,
                                email: firebaseUser.email || '',
                            },
                            loading: false,
                        })
                    } else {
                        set({ user: null, loading: false })
                    }
                })
            },
        }),
        {
            name: 'auth-store',
            partialize: (state) => ({ user: state.user }),
        }
    )
)
