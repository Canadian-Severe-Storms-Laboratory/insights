import { Fallback } from '@/components/fallback';

export function ViewerFallback() {
    return (
        <div className="h-full w-full overflow-hidden rounded-md">
            <Fallback />
        </div>
    );
}
