import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import * as React from 'react';

function SearchBar({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div className="flex w-full items-center gap-4 pb-4" {...props}>
            <Search data-slot="search-bar px-4" />
            <Input />
        </div>
    );
}

export { SearchBar };
