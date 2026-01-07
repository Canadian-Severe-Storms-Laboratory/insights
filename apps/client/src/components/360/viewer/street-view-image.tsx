import { useLoader } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export function StreetViewImage({
    image,
    startingAngleRad
}: {
    image: string;
    startingAngleRad: number;
}) {
    const meshRef = useRef<THREE.Mesh>(null);
    const texture = useLoader(THREE.TextureLoader, image);

    useEffect(() => {
        if (!texture) return;

        texture.mapping = THREE.EquirectangularReflectionMapping;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.wrapS = THREE.RepeatWrapping;
        texture.repeat.x = -1;
        texture.needsUpdate = true;

        // Apply starting rotation
        meshRef.current?.setRotationFromAxisAngle(new THREE.Vector3(0, 1, 0), -startingAngleRad);
    }, [texture, startingAngleRad]);

    if (!texture) return null;

    return (
        <mesh ref={meshRef}>
            <sphereGeometry attach="geometry" args={[500, 60, 40, 90]} />
            <meshBasicMaterial attach="material" map={texture} side={THREE.BackSide} />
        </mesh>
    );
}
