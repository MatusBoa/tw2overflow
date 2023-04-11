define('two/exampleModule/settings', [], function () {
    return {
        PRESETS: 'presets',
        GROUPS: 'groups',
        SOME_NUMBER: 'some_number'
    }
})

define('two/exampleModule/settings/updates', function () {
    return {
        PRESETS: 'presets',
        GROUPS: 'groups'
    }
})

define('two/exampleModule/settings/map', [
    'two/exampleModule/settings',
    'two/exampleModule/settings/updates'
], function (
    SETTINGS,
    UPDATES
) {
    return {
        [SETTINGS.PRESETS]: {
            default: [],
            updates: [
                UPDATES.PRESETS
            ],
            disabledOption: true,
            inputType: 'select',
            multiSelect: true,
            type: 'presets'
        },
        [SETTINGS.GROUPS]: {
            default: [],
            updates: [
                UPDATES.GROUPS,
            ],
            disabledOption: true,
            inputType: 'select',
            multiSelect: true,
            type: 'groups'
        },
        [SETTINGS.SOME_NUMBER]: {
            default: 60,
            inputType: 'number',
            min: 0,
            max: 120
        }
    }
})
