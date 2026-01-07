import { useXRControllerButtonEvent, useXRInputSourceState } from '@react-three/xr';

export function MovementController(props: {
    hand: 'left' | 'right';
    onTrigger: () => unknown;
    onSqueeze: () => unknown;
    onPrimaryButton: () => unknown;
}) {
    const { hand, onTrigger, onSqueeze, onPrimaryButton } = props;

    const controller = useXRInputSourceState('controller', hand);

    useXRControllerButtonEvent(controller, hand === 'left' ? 'y-button' : 'b-button', (state) => {
        if (state === 'pressed') onPrimaryButton();
    });

    useXRControllerButtonEvent(controller, 'xr-standard-trigger', (state) => {
        if (state === 'pressed') onTrigger();
    });

    useXRControllerButtonEvent(controller, 'xr-standard-squeeze', (state) => {
        if (state === 'pressed') onSqueeze();
    });

    return null;
}
