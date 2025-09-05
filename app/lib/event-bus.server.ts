import { EventEmitter } from 'events';

export type Event = Readonly<{
	id: string;
}>;

class EventBus {
	private readonly bus = new EventEmitter();

	addListener<T>(id: string, listener: (event: T) => void) {
		this.bus.addListener(id, listener);
	}

	removeListener<T>(id: string, listener: (event: T) => void) {
		this.bus.removeListener(id, listener);
	}

	emit<T extends Event>(event: T) {
		this.bus.emit(event.id, event);
	}
}

// Creating and exposing the singleton instance of the EventBus
export const uploadEventBus = new EventBus();
