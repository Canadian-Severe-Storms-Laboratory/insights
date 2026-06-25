import { create } from 'zustand';

export const useStore = create<{
    searchString: string,
    startDate: Date|undefined;
    endDate: Date|undefined;
    uploader: 'self' | 'anyone';
    setSearchString: (searchSting: string) => void;
    setStartDate: (startDate: Date) => void;
    setEndDate: (endDate: Date) => void;
    setUploader: (uploader: 'self' | 'anyone') => void;
    reset: () => void;

}>((set, get, store) => ({
    searchString: '',
    startDate: undefined,
    endDate: undefined,
    uploader: 'anyone',
    setSearchString: (searchString: string) => set({searchString}),
    setStartDate: (startDate: Date|undefined) => set({ startDate }),
    setEndDate: (endDate: Date|undefined) => set({ endDate }),
    setUploader: (uploader: 'self' | 'anyone') => set({ uploader }),
    reset: () => {set(store.getInitialState(), true)}

}));
