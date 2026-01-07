import { EmptyState } from '@/components/empty-state';
import { $getPathByIdAll } from '@/lib/client';
import { isNotFound, isRedirect, notFound, redirect } from '@tanstack/react-router';
import { DetailedError, parseResponse } from 'hono/client';
import { z } from 'zod';

export const JUMP_SIZE = 5;

const searchIndexSchema = z.number().int().nonnegative().default(0);
const searchStateSchema = z.union([z.literal('before'), z.literal('after')]).default('after');

export type SearchSchema = {
    index: z.infer<typeof searchIndexSchema>;
    state: z.infer<typeof searchStateSchema>;
};

export function validate360ViewerSearch(search: Record<string, unknown>): SearchSchema {
    const index = searchIndexSchema.safeParse(search.index);
    const state = searchStateSchema.safeParse(search.state);

    const newSearch: SearchSchema = {
        index: 0,
        state: 'after'
    };

    if (index.success) newSearch.index = index.data;
    if (state.success) newSearch.state = state.data;

    return newSearch;
}

export function notFound360Viewer(): React.ReactNode {
    return <EmptyState title="Path Not Found" description="The requested path does not exist." />;
}

export function error360Viewer({ error }: { error: unknown }): React.ReactNode {
    return (
        <EmptyState
            title="Error"
            description={
                error instanceof Error
                    ? error.message
                    : 'An unknown error occurred while loading the path.'
            }
        />
    );
}

export async function load360ViewerData({ params }: { params: { id: string } }) {
    try {
        const response = await parseResponse(
            $getPathByIdAll({
                param: { id: params.id }
            })
        );

        if (response.path.status !== 'complete') {
            throw redirect({
                to: '/360'
            });
        }

        return response.path;
    } catch (error) {
        if (isRedirect(error) || isNotFound(error)) throw error;

        if (
            error instanceof DetailedError &&
            (error.statusCode === 400 || error.statusCode === 404)
        ) {
            throw notFound();
        }

        console.error('Error fetching path by ID:', error);
        throw redirect({
            to: '/360/new'
        });
    }
}
