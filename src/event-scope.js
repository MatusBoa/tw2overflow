define('two/EventScope', [
    'queues/EventQueue'
], function (eventQueue) {
    const EventScope = function (windowId, onDestroy) {
        if (typeof windowId === 'undefined') {
            throw new Error('EventScope: no windowId');
        }

        this.windowId = windowId;
        this.onDestroy = onDestroy || noop;
        this.listeners = [];

        const unregister = $rootScope.$on(eventTypeProvider.WINDOW_CLOSED, (event, templateName) => {
            if (templateName === '!' + this.windowId) {
                this.destroy();
                unregister();
            }
        });
    };

    EventScope.prototype.register = function (id, handler, _root) {
        if (_root) {
            this.listeners.push($rootScope.$on(id, handler));
        } else {
            eventQueue.register(id, handler);

            this.listeners.push(function () {
                eventQueue.unregister(id, handler);
            });
        }
    };

    EventScope.prototype.destroy = function () {
        this.listeners.forEach((unregister) => {
            unregister();
        });

        this.onDestroy();
    };

    return EventScope;
});
