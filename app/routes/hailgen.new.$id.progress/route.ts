import { LoaderFunctionArgs } from '@remix-run/node';
import { eq } from 'drizzle-orm';
import { eventStream } from 'remix-utils/sse/server';
import { db } from '~/db/db.server';
import { hailpad } from '~/db/schema';
import { Event, uploadEventBus } from '~/lib/event-bus.server';

export async function loader({ request, params }: LoaderFunctionArgs) {
    const id = params.id;
    
    if (!id) throw new Response(null, { status: 404, statusText: 'Not found' });
    if (!(await db.query.hailpad.findFirst({ where: eq(hailpad.id, id) })))
        throw new Response(null, { status: 404, statusText: 'Not found' });
    
    return eventStream(request.signal, (send) => {
        const handle = (event: Event) => {
            send({
                event: event.id,
                data: JSON.stringify(event)
            });
        };

        uploadEventBus.addListener(id, handle);

        return () => {
            uploadEventBus.removeListener(id, handle);
        };
    });
}
