define('two/about', [], function () {
    let initialized = false;

    const about = {};

    about.isInitialized = function () {
        return initialized;
    };

    about.init = function () {
        initialized = true;
    };

    return about;
});
