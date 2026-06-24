import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DateFilter, UploaderFilter } from '@/components/ui/filter-item';
import { ListFilter } from 'lucide-react';

export function FilterMenu() {
    return (
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
                <DateFilter></DateFilter>
                <UploaderFilter />
            </CardContent>
        </Card>
    );
}
