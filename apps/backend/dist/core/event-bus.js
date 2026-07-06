import { EventEmitter } from 'node:events';
class AppEventBus {
    emitter = new EventEmitter();
    on(event, handler) {
        this.emitter.on(event, handler);
    }
    emit(event, data) {
        this.emitter.emit(event, data);
    }
}
export const eventBus = new AppEventBus();
//# sourceMappingURL=event-bus.js.map