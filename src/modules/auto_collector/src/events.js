define('two/autoCollector/events', [], function () {
    angular.extend(eventTypeProvider, {
        AUTO_COLLECTOR_STARTED: 'auto_collector_started',
        AUTO_COLLECTOR_STOPPED: 'auto_collector_stopped',
        AUTO_COLLECTOR_SECONDVILLAGE_STARTED: 'auto_collector_secondvillage_started',
        AUTO_COLLECTOR_SECONDVILLAGE_STOPPED: 'auto_collector_secondvillage_stopped'
    });
});
