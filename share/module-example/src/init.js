require([
    'two/ready',
    'two/exampleModule',
    'two/exampleModule/ui',
    'two/exampleModule/events'
], function (
    ready,
    exampleModule,
    exampleModuleInterface
) {
    if (exampleModule.isInitialized()) {
        return false
    }

    ready(function () {
        exampleModule.init()
        exampleModuleInterface()
    })
})
