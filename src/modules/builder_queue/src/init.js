require([
    'two/ready',
    'two/builderQueue',
    'two/builderQueue/ui',
    'two/builderQueue/events'
], function (
    ready,
    builderQueue,
    builderQueueInterface
) {
    if (builderQueue.isInitialized()) {
        return false;
    }

    ready(function () {
        builderQueue.init();
        builderQueueInterface();
    });
});
