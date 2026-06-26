import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from './toggle-group';

function OptionRow({
    children,
    type = 'column',
    className
}: {
    children?: React.ReactNode;
    type?: 'row' | 'column';
    className?: string;
}) {
    return (
        <div
            className={cn(
                'flex gap-2',
                type === 'row' ? 'flex-row items-center' : 'flex-col items-start',
                className
            )}
        >
            {children}
        </div>
    );
}

function DateFilter() {
    return (
        <OptionRow>
            <div className="flex flex-row space-x-2">
                <Label className="w-12">From:</Label>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button className="w-36" variant={'outline'}>
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" />
                    </PopoverContent>
                </Popover>
            </div>
            <div className="flex flex-row space-x-2">
                <Label className="w-12">To:</Label>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button className="w-36" variant={'outline'}>
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" />
                    </PopoverContent>
                </Popover>
            </div>
        </OptionRow>
    );
}

function UploaderFilter() {
    return (
        <OptionRow>
            <div className="flex gap-4">
                <Label>Uploader:</Label>
                <ToggleGroup type="single" variant="outline">
                    <ToggleGroupItem value="self" className="flex flex-row gap-1">
                        Self
                    </ToggleGroupItem>
                    <ToggleGroupItem value="anyone" className="flex flex-row gap-1">
                        Anyone
                    </ToggleGroupItem>
                </ToggleGroup>
            </div>
        </OptionRow>
    );
}

export { DateFilter, UploaderFilter };
