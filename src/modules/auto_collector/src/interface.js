define('two/autoCollector/ui', [
    'two/ui',
    'two/autoCollector',
    'two/utils',
    'queues/EventQueue'
], function (
    interfaceOverflow,
    autoCollector,
    utils,
    eventQueue
) {
    let $button;

    const init = function () {
        if (!modelDataService.getWorldConfig().isResourceDepositEnabled()) {
            return false;
        }

        $button = interfaceOverflow.addMenuButton('Collector', 50, $filter('i18n')('description', $rootScope.loc.ale, 'auto_collector'));
        
        $button.addEventListener('click', function () {
            if (autoCollector.isRunning()) {
                autoCollector.stop();
                autoCollector.secondVillage.stop();
                utils.notif('success', $filter('i18n')('deactivated', $rootScope.loc.ale, 'auto_collector'));
            } else {
                autoCollector.start();
                autoCollector.secondVillage.start();
                utils.notif('success', $filter('i18n')('activated', $rootScope.loc.ale, 'auto_collector'));
            }
        });

        eventQueue.register(eventTypeProvider.AUTO_COLLECTOR_STARTED, function () {
            $button.classList.remove('btn-orange');
            $button.classList.add('btn-red');
        });

        eventQueue.register(eventTypeProvider.AUTO_COLLECTOR_STOPPED, function () {
            $button.classList.remove('btn-red');
            $button.classList.add('btn-orange');
        });

        if (autoCollector.isRunning()) {
            eventQueue.trigger(eventTypeProvider.AUTO_COLLECTOR_STARTED);
        }
    };

    return init;
});
