import { Spinner } from '@/components/ui/spinner';

export function Fallback() {
    return (
        <div className="flex h-full flex-row items-center justify-center gap-2">
            <Spinner />
            <div className="text-2xl font-bold">Loading...</div>
        </div>
    );
}
