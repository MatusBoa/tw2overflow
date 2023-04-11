require([
    'two/ready',
    'two/farmOverflow',
    'two/farmOverflow/ui',
    'two/farmOverflow/events'
], function (
    ready,
    farmOverflow,
    farmOverflowInterface
) {
    if (farmOverflow.isInitialized()) {
        return false;
    }

    ready(function () {
        farmOverflow.init();
        farmOverflowInterface();
    }, ['map', 'presets']);
});
