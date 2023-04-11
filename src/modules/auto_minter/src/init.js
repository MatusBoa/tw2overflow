require([
    'two/ready',
    'two/autoMinter',
    'two/autoMinter/ui',
    'two/autoMinter/events'
], function (
    ready,
    autoMinter,
    autoMinterInterface
) {
    if (autoMinter.isInitialized()) {
        return false;
    }

    ready(function () {
        autoMinter.init();
        autoMinterInterface();
    });
});
