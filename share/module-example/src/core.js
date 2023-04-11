define('two/exampleModule', [
    'two/Settings',
    'two/exampleModule/settings',
    'two/exampleModule/settings/map',
    'two/exampleModule/settings/updates',
    'two/ready',
    'queues/EventQueue'
], function (
    Settings,
    SETTINGS,
    SETTINGS_MAP,
    UPDATES,
    ready,
    eventQueue
) {
    let initialized = false
    let running = false
    let settings
    let exampleSettings

    let selectedPresets = []
    let selectedGroups = []

    const STORAGE_KEYS = {
        SETTINGS: 'example_module_settings'
    }

    const updatePresets = function () {
        selectedPresets = []

        const allPresets = modelDataService.getPresetList().getPresets()
        const presetsSelectedByTheUser = exampleSettings[SETTINGS.PRESETS]

        presetsSelectedByTheUser.forEach(function (presetId) {
            selectedPresets.push(allPresets[presetId])
        })

        console.log('selectedPresets', selectedPresets)
    }

    const updateGroups = function () {
        selectedGroups = []

        const allGroups = modelDataService.getGroupList().getGroups()
        const groupsSelectedByTheUser = exampleSettings[SETTINGS.GROUPS]

        groupsSelectedByTheUser.forEach(function (groupId) {
            selectedGroups.push(allGroups[groupId])
        })

        console.log('selectedGroups', selectedGroups)
    }

    const examplePublicFunctions = {}

    examplePublicFunctions.init = function () {
        initialized = true

        settings = new Settings({
            settingsMap: SETTINGS_MAP,
            storageKey: STORAGE_KEYS.SETTINGS
        })

        settings.onChange(function (changes, updates) {
            exampleSettings = settings.getAll()

            // here you can handle settings that get modified and need
            // some processing. Useful to not break the script when updated
            // while running.

            if (updates[UPDATES.PRESETS]) {
                updatePresets()
            }

            if (updates[UPDATES.GROUPS]) {
                updateGroups()
            }
        })

        exampleSettings = settings.getAll()

        console.log('all settings', exampleSettings)

        ready(function () {
            updatePresets()
        }, 'presets')

        $rootScope.$on(eventTypeProvider.ARMY_PRESET_UPDATE, updatePresets)
        $rootScope.$on(eventTypeProvider.ARMY_PRESET_DELETED, updatePresets)
        $rootScope.$on(eventTypeProvider.GROUPS_CREATED, updateGroups)
        $rootScope.$on(eventTypeProvider.GROUPS_DESTROYED, updateGroups)
        $rootScope.$on(eventTypeProvider.GROUPS_UPDATED, updateGroups)
    }

    examplePublicFunctions.start = function () {
        running = true

        console.log('selectedPresets', selectedPresets)
        console.log('selectedGroups', selectedGroups)

        eventQueue.trigger(eventTypeProvider.EXAMPLE_MODULE_START)
    }

    examplePublicFunctions.stop = function () {
        running = false

        console.log('example module stop')

        eventQueue.trigger(eventTypeProvider.EXAMPLE_MODULE_STOP)
    }

    examplePublicFunctions.getSettings = function () {
        return settings
    }

    examplePublicFunctions.isInitialized = function () {
        return initialized
    }

    examplePublicFunctions.isRunning = function () {
        return running
    }

    return examplePublicFunctions
})
