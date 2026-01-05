import { useFrame } from '@react-three/fiber';
import { Euler, Vector3 } from 'three';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from './store';

export function DebugTools() {
    const { cameraPosition, cameraRotation, setCameraPosition, setCameraRotation, setFPS } =
        useStore(
            useShallow((state) => ({
                cameraPosition: state.cameraPosition,
                cameraRotation: state.cameraRotation,
                setCameraPosition: state.setCameraPosition,
                setCameraRotation: state.setCameraRotation,
                setFPS: state.setFPS
            }))
        );

    useFrame(({ camera }, delta) => {
        // Calculate FPS
        setFPS(Math.floor(1 / delta));

        // Check if the camera has moved
        const oldPosition = new Vector3(...cameraPosition);
        const oldRotation = new Euler(...cameraRotation);

        if (!camera.position.equals(oldPosition)) {
            setCameraPosition([camera.position.x, camera.position.y, camera.position.z]);
        }

        if (!camera.rotation.equals(oldRotation)) {
            setCameraRotation([camera.rotation.x, camera.rotation.y, camera.rotation.z]);
        }
    });

    return null;
}
