require([
    'two/ready',
    'two/about',
    'two/about/ui'
], function (
    ready,
    about,
    aboutInterface
) {
    if (about.isInitialized()) {
        return false;
    }

    ready(function () {
        about.init();
        aboutInterface();
    }, ['map']);
});
