import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LucideCornerDownLeft } from 'lucide-react';
import { useState } from 'react';

export function FramePicker({
    index,
    length,
    onJump
}: {
    index: number;
    length?: number;
    onJump?: (index: number) => void;
}) {
    const [value, setValue] = useState<number | null>(null);

    return (
        <div className="flex flex-row items-center gap-4">
            <Input
                className="max-w-16"
                type="number"
                placeholder={`${index}`}
                value={value ?? ''}
                min={1}
                max={length}
                onChange={(e) => setValue(parseInt(e.target.value))}
            />
            <p>{`/ ${length}`}</p>
            <Button
                variant="secondary"
                size="icon"
                onClick={() => {
                    onJump?.(value ? value - 1 : index - 1);
                    setValue(null);
                }}
            >
                <LucideCornerDownLeft size={16} />
            </Button>
        </div>
    );
}
