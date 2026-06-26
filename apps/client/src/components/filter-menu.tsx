import { useStore } from '@/lib/stores/filter-settings';
import { useShallow } from 'zustand/react/shallow';

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import { cn } from '@/lib/utils';

import { format } from 'date-fns';

import { Search } from 'lucide-react';
import { CalendarIcon } from 'lucide-react';
import { ListFilter } from 'lucide-react';


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

function FileNameSearchFilter(){
    const {searchString, setSearchString } = useStore(
        useShallow((state) => ({
            searchString: state.searchString,
            setSearchString: state.setSearchString
        }))
    ) 
        return (
        <div className="flex w-full items-center gap-4 pb-4">
            <Search data-slot="search-bar px-4" />
            <Input 
            placeholder='Search'
            value={searchString}
            onChange={(e) => setSearchString(e.target.value)}/>
        </div>
    );
    
}

function StartDateFilter() {
    const { startDate, setStartDate, endDate } = useStore(
        useShallow((state) => ({
            startDate: state.startDate,
            setStartDate: state.setStartDate,
            endDate: state.endDate
        }))
    ); 
    return (
        <OptionRow>
            <div className="flex flex-row space-x-2">
                <Label className="w-12">From:</Label>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button className="w-36" variant={'outline'}>
                            { startDate ? (format(startDate, 'PPP')):(<span>Pick a date</span>)}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single"
                        selected={startDate}
                        onSelect={(date) => setStartDate(date as Date)}
                        disabled={{before : new Date('1900-01-01'), after: endDate || new Date()}} />
                    </PopoverContent>
                </Popover>
            </div>
        </OptionRow>
    );
}


function EndDateFilter() {
    const { startDate, endDate, setEndDate } = useStore(
        useShallow((state) => ({
            startDate: state.startDate,
            endDate: state.endDate,
            setEndDate: state.setEndDate
        }))
    ); 
    return (
        <OptionRow>
            <div className="flex flex-row space-x-2">
                <Label className="w-12">To:</Label>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button className="w-36" variant={'outline'}>
                            { endDate ? (format(endDate, 'PPP')):(<span>Pick a date</span>)}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single"
                        selected={endDate}
                        onSelect={ (date) => setEndDate(date as Date)} 
                        disabled={{before: startDate ||new Date('1900-01-01'), after : new Date()}} />
                    </PopoverContent>
                </Popover>
            </div>
        </OptionRow>
    );
}

function UploaderFilter() {
    const { uploader, setUploader } = useStore(
        useShallow((state) => ({
            uploader: state.uploader,
            setUploader: state.setUploader
        }))
    )
    return (
        <OptionRow>
            <div className="flex gap-4">
                <Label>Uploader:</Label>
                <ToggleGroup 
                type="single" 
                variant="outline"
                value={uploader}
                onValueChange={(value) => setUploader( value as 'self' | 'anyone') }>
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


function ApplyFilter() {
    const {reset} = useStore(
        useShallow((state) => ({
            reset: state.reset
        }))
    )
    return (
        <OptionRow>
            <div className="flex gap-4">
                <Button className="w-36" variant={'outline'} onClick={reset}>
                            <span> Clear </span>
                </Button>
            </div>
        </OptionRow>
    );
}


export function FilterMenu() {
    return (
        <div>
            <FileNameSearchFilter />
        <Card className="w-full py-2">
            <CardHeader>
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <ListFilter />
                        <CardTitle className="mb-1">Filters</CardTitle>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4">
                <StartDateFilter />
                <EndDateFilter />
                <UploaderFilter />
            </CardContent>
            <CardFooter className='justify-center'>
                <ApplyFilter />
            </CardFooter>
        </Card>
        </div>
    );
}
