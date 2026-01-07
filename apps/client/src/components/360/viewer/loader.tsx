import { Html, useProgress } from '@react-three/drei';

export function Loader() {
    const { progress, errors } = useProgress();

    if (errors.length > 0) {
        return (
            <Html center>
                <div className="flex h-full flex-col items-center justify-center">
                    <div className="text-2xl font-bold">Error</div>
                    <div className="text-lg">Could not load image!</div>
                    <div className="text-sm">
                        {errors.map((error) => (
                            <p key={error}>{error}</p>
                        ))}
                    </div>
                </div>
            </Html>
        );
    }

    return (
        <Html center>
            <div className="flex h-full flex-col items-center justify-center">
                <div className="text-2xl font-bold">Loading</div>
                <div className="text-lg">{progress.toFixed(2)}%</div>
            </div>
        </Html>
    );
}
