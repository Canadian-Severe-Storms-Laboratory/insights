import { create } from 'zustand';

export const useStore = create<{
    cameraPosition: [number, number, number];
    cameraRotation: [number, number, number];
    shape: number;
    size: number;
    budget: number;
    fps: number;
    cameraControl: 'fly' | 'earth';
    initialTransform: {
        position: [number, number, number];
        rotation: [number, number, number];
    };
    setShape: (shape: number) => void;
    setSize: (size: number) => void;
    setBudget: (budget: number) => void;
    setFPS: (fps: number) => void;
    setCameraControl: (cameraControl: 'fly' | 'earth') => void;
    setCameraPosition: (position: [number, number, number]) => void;
    setCameraRotation: (rotation: [number, number, number]) => void;
    setInitialTransform: (
        position: [number, number, number],
        rotation: [number, number, number]
    ) => void;
}>((set) => ({
    cameraPosition: [0, 0, 0],
    cameraRotation: [0, 0, 0],
    shape: 0,
    size: 1,
    budget: 1_000_000,
    fps: 0,
    cameraControl: 'fly',
    initialTransform: {
        position: [0, 0, 0],
        rotation: [0, 0, 0]
    },
    setShape: (shape: number) => set({ shape }),
    setSize: (size: number) => set({ size }),
    setFPS: (fps: number) => set({ fps }),
    setBudget: (budget: number) => set({ budget }),
    setCameraControl: (cameraControl: 'fly' | 'earth') => set({ cameraControl }),
    setCameraPosition: (cameraPosition: [number, number, number]) => set({ cameraPosition }),
    setCameraRotation: (cameraRotation: [number, number, number]) => set({ cameraRotation }),
    setInitialTransform: (position: [number, number, number], rotation: [number, number, number]) =>
        set({ initialTransform: { position, rotation } })
}));
