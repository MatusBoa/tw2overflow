require([
    'two/ready',
    'two/commandQueue',
    'two/commandQueue/ui',
    'two/commandQueue/events'
], function (
    ready,
    commandQueue,
    commandQueueInterface
) {
    if (commandQueue.initialized) {
        return false;
    }

    ready(function () {
        commandQueue.init();
        commandQueueInterface();

        if (commandQueue.getWaitingCommands().length > 0) {
            commandQueue.start(true);
        }
    }, ['map', 'world_config']);
});
