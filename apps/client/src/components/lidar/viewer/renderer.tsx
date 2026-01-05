import { useFrame, useThree } from '@react-three/fiber';
import { PointCloudOctree, PointSizeType, Potree } from 'potree-core';
import { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { PotreeFlyControls } from './navigation/fly';
import { useStore } from './store';

const potree = new Potree();

export function Renderer({ pointCloudURL }: { pointCloudURL: string }) {
    const { size, shape, budget, cameraControl, initialTransform } = useStore(
        useShallow((state) => ({
            size: state.size,
            shape: state.shape,
            budget: state.budget,
            cameraControl: state.cameraControl,
            initialTransform: state.initialTransform
        }))
    );
    const scene = useThree((state) => state.scene);
    const camera = useThree((state) => state.camera);
    const [pointClouds, setPointClouds] = useState<PointCloudOctree[]>([]);

    useEffect(() => {
        potree.pointBudget = budget;

        console.log('[LiDAR Renderer] Loading point cloud...');

        (async () => {
            const result = await potree.loadPointCloud('metadata.json', pointCloudURL);

            // Ensure the axes are aligned with the world axes
            result.position.set(0, 0, 0);
            result.rotation.x = -Math.PI / 2;
            result.material.shape = shape;
            result.material.size = size;

            result.material.inputColorEncoding = 1;
            result.material.outputColorEncoding = 1;

            // Set the point size type to adaptive
            result.material.pointSizeType = PointSizeType.ADAPTIVE;

            // Set to proper shader
            result.material.updateShaderSource();

            scene.clear();
            scene.add(result as any);
            setPointClouds([result]);

            console.log('[LiDAR Renderer] Loaded point cloud!');
        })();
        // oxlint-disable-next-line exhaustive-deps
    }, []);

    useEffect(() => {
        console.log('[LiDAR Renderer] Setting initial camera transform...');

        const { position, rotation } = initialTransform;

        camera.position.set(position[0], position[1], position[2]);
        camera.rotation.set(rotation[0], rotation[1], rotation[2]);
    }, [initialTransform]);

    useEffect(() => {
        console.log('[LiDAR Renderer] Updating point budget...');
        potree.pointBudget = budget;
    }, [budget]);

    useEffect(() => {
        if (!pointClouds.length) return;

        console.log('[LiDAR Renderer] Updating point cloud...');

        // Only ever one point cloud
        const pointCloud = pointClouds[0];

        if (!pointCloud) return;

        pointCloud.material.shape = shape;
        pointCloud.material.size = size;
    }, [size, shape]);

    useFrame(({ gl, camera }) => {
        potree.updatePointClouds(pointClouds, camera, gl);
    });

    if (cameraControl === 'fly') {
        return <PotreeFlyControls selector="#potree-canvas" />;
    }
    return null;
}
