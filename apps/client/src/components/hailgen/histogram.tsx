import {
    type ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent
} from '@/components/ui/chart';
import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts';

const chartConfig = {
    count: {
        label: 'Count',
        color: '#8F55E0'
    }
} satisfies ChartConfig;

export default function Histogram({ data }: { data: number[] }) {
    const binnedData: { bin: string; count: number }[] = useMemo(() => {
        // Filter out dents with axes greater than 100
        data = data.filter((val) => val <= 100);

        const bins: { bin: string; count: number }[] = [];

        const min = 0;
        const max = Math.ceil(Math.max(...data) / 5) * 5;

        // Create bins in increments of 5
        for (let i = min; i < max; i += 5) {
            bins.push({ bin: `[${i}, ${i + 5})`, count: 0 });
        }

        data.forEach((num) => {
            const binIndex = Math.floor(num / 5);
            if (binIndex < bins.length) {
                const bin = bins[binIndex];
                if (bin) bin.count += 1;
            } else {
                // Calculate the start of the new bin range
                const newBinStart = Math.floor(num / 5) * 5;
                // Create a new bin for the out-of-bounds value
                const newBin = { bin: `[${newBinStart}, ${newBinStart + 5})`, count: 1 };
                // Add the new bin to the bins array
                bins.push(newBin);
            }
        });

        return bins;
    }, [data]);

    return (
        data && (
            <ChartContainer config={chartConfig} className="min-h-[400px] w-full">
                <BarChart accessibilityLayer data={binnedData}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                        dataKey="bin"
                        type="category"
                        tickLine={false}
                        tickMargin={10}
                        axisLine={true}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="var(--color-count)" radius={4} />
                </BarChart>
            </ChartContainer>
        )
    );
}
