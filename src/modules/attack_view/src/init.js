require([
    'two/ready',
    'two/attackView',
    'two/attackView/ui',
    'two/attackView/events'
], function (
    ready,
    attackView,
    attackViewInterface
) {
    if (attackView.isInitialized()) {
        return false;
    }

    ready(function () {
        attackView.init();
        attackViewInterface();
    });
});
