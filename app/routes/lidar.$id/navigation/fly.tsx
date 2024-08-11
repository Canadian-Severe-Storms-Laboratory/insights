import { FlyControls, PointerLockControls } from '@react-three/drei';
import { useEffect, useState } from 'react';
import { CameraControlProps, clamp } from './utils';

export default function ({ selector }: CameraControlProps) {
	const [speed, setSpeed] = useState(5);

    console.log(speed);

	useEffect(() => {
		const handler = (e: WheelEvent) => {
			setSpeed((prev) => clamp(prev * Math.pow(1.1, -1 * (e.deltaY / 100)), 0.1, 20));
		};

		window.addEventListener('wheel', handler);

		return () => {
			window.removeEventListener('wheel', handler);
		};
	}, []);

	return (
		<PointerLockControls makeDefault selector={selector}>
			<FlyControls movementSpeed={speed} rollSpeed={0} />
		</PointerLockControls>
	);
}
