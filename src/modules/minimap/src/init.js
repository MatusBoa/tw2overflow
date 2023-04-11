require([
    'two/ready',
    'two/minimap',
    'two/minimap/ui',
    'two/minimap/events',
    'two/minimap/types/actions',
    'two/minimap/settings',
    'two/minimap/settings/updates',
    'two/minimap/settings/map'
], function (
    ready,
    minimap,
    minimapInterface
) {
    if (minimap.initialized) {
        return false;
    }

    ready(function () {
        minimap.init();
        minimapInterface();
        minimap.run();
    }, 'map');
});
