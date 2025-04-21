import { create } from 'zustand';
import { HeaderSlotStore} from '@/types';

export const useHeaderSlot = create<HeaderSlotStore>((set) => ({
    title: '',
    right: undefined,
    left: undefined,
    setHeaderRight: (node) => set({ right: node }),
    setHeaderLeft: (node) => set({ left: node }),
    clearHeader: () => set({ title: '', right: undefined, left: undefined }),
}));
