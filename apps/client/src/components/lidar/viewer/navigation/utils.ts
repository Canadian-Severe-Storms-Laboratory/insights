import { type PickPoint, PointCloudOctree } from 'potree-core';
import * as THREE from 'three';

export interface CameraControlProps {
    selector?: string;
}

export function getMousePointCloudIntersection(
    mouse: {
        x: number;
        y: number;
    },
    camera: THREE.Camera,
    renderer: THREE.WebGLRenderer,
    pointClouds: PointCloudOctree[]
) {
    const newMouse = new THREE.Vector2(
        (mouse.x / window.innerWidth) * 2 - 1,
        -(mouse.y / window.innerHeight) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(newMouse, camera);
    const ray = raycaster.ray;

    const result: {
        location: THREE.Vector3 | null;
        distance: number;
        pointcloud: PointCloudOctree | null;
        point: PickPoint | null;
    } = {
        location: null,
        distance: Number.MAX_VALUE,
        pointcloud: null,
        point: null
    };

    for (const pointCloud of pointClouds) {
        const point = pointCloud.pick(renderer, camera, ray);

        if (!point || !point.position) continue;

        const distance = camera.position.distanceTo(point.position);

        if (distance < result.distance) {
            result.location = point.position;
            result.distance = distance;
            result.pointcloud = pointCloud;
            result.point = point;
        }
    }

    if (!result.pointcloud) return null;
    return result;
}

export function projectedRadius(
    radius: number,
    camera: THREE.Camera,
    distance: number,
    screenWidth: number,
    screenHeight: number
) {
    if (camera instanceof THREE.OrthographicCamera) {
        return projectedRadiusOrtho(radius, camera.projectionMatrix, screenWidth, screenHeight);
    } else if (camera instanceof THREE.PerspectiveCamera) {
        return projectedRadiusPerspective(
            radius,
            (camera.fov * Math.PI) / 180,
            distance,
            screenHeight
        );
    } else {
        throw new Error('Invalid parameters');
    }
}

function projectedRadiusPerspective(
    radius: number,
    fov: number,
    distance: number,
    screenHeight: number
) {
    let projFactor = 1 / Math.tan(fov / 2) / distance;
    projFactor = (projFactor * screenHeight) / 2;

    return radius * projFactor;
}

function projectedRadiusOrtho(
    radius: number,
    proj: THREE.Matrix4,
    screenWidth: number,
    screenHeight: number
) {
    let p1: THREE.Vector4 | THREE.Vector3 = new THREE.Vector4(0);
    let p2: THREE.Vector4 | THREE.Vector3 = new THREE.Vector4(radius);

    p1.applyMatrix4(proj);
    p2.applyMatrix4(proj);
    p1 = new THREE.Vector3(p1.x, p1.y, p1.z);
    p2 = new THREE.Vector3(p2.x, p2.y, p2.z);
    p1.x = (p1.x + 1.0) * 0.5 * screenWidth;
    p1.y = (p1.y + 1.0) * 0.5 * screenHeight;
    p2.x = (p2.x + 1.0) * 0.5 * screenWidth;
    p2.y = (p2.y + 1.0) * 0.5 * screenHeight;
    return p1.distanceTo(p2);
}

export function mouseToRay(
    mouse: { x: number; y: number },
    camera: THREE.Camera,
    width: number,
    height: number
) {
    const normalizedMouse = {
        x: (mouse.x / width) * 2 - 1,
        y: -(mouse.y / height) * 2 + 1
    };

    const vector = new THREE.Vector3(normalizedMouse.x, normalizedMouse.y, 0.5);
    const origin = camera.position.clone();
    vector.unproject(camera);
    const direction = vector.sub(origin).normalize();

    const ray = new THREE.Ray(origin, direction);

    return ray;
}

export function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
}
