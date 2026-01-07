import type { CameraControls } from '@react-three/drei';
import { LucideNavigation2 } from 'lucide-react';
import { useEffect, useRef } from 'react';

export function Compass({ controls }: { controls: CameraControls | null }) {
    const iconRef = useRef<SVGSVGElement>(null);

    const handleClick = () => {
        if (controls) {
            controls.rotateAzimuthTo(0, true);

            if (iconRef.current) {
                iconRef.current.style.transform = `rotate(0deg)`;
            }
        }
    };

    useEffect(() => {
        if (!controls) return;

        const updateRotation = () => {
            const azimuthAngle = controls.azimuthAngle;
            const degrees = (azimuthAngle * 180) / Math.PI;

            if (iconRef.current) {
                iconRef.current.style.transform = `rotate(${degrees}deg)`;
            }
        };

        controls.addEventListener('control', updateRotation);
        controls.addEventListener('update', updateRotation);

        updateRotation();

        return () => {
            controls.removeEventListener('control', updateRotation);
            controls.removeEventListener('update', updateRotation);
        };
    }, [controls]);

    return (
        <button
            title="Reset View"
            aria-label="Reset View"
            className="bg-background/60 hover:bg-foreground/40 hover:text-background absolute right-0 z-10 m-2 rounded-lg p-2 backdrop-blur transition hover:cursor-pointer"
            onClick={handleClick}
        >
            <LucideNavigation2
                ref={iconRef}
                className="transform-gpu"
                style={{ transform: 'rotate(0deg)' }}
            />
        </button>
    );
}
