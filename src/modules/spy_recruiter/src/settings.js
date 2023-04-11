define('two/___spy_recruiter_id/settings', [], function () {
    return {
        PRESERVE_WOOD: 'preserve_wood',
        PRESERVE_CLAY: 'preserve_clay',
        PRESERVE_IRON: 'preserve_iron',
        ENABLED_GROUPS: 'enabled_groups',
        CHECK_INTERVAL: 'check_interval',
        RECRUIT_SINGLE_SPY: 'recruit_single_spy'
    };
});

define('two/___spy_recruiter_id/settings/updates', function () {
    return {
        GROUPS: 'groups',
        PRESERVE_RESOURSES: 'preserve_resourses',
        UPDATE_INTERVAL: 'update_interval'
    };
});

define('two/___spy_recruiter_id/settings/map', [
    'two/___spy_recruiter_id/settings',
    'two/___spy_recruiter_id/settings/updates'
], function (
    SETTINGS,
    UPDATES
) {
    return {
        [SETTINGS.PRESERVE_WOOD]: {
            default: 50000,
            updates: [
                UPDATES.PRESERVE_RESOURSES
            ],
            inputType: 'number',
            min: 0,
            max: 600000
        },
        [SETTINGS.PRESERVE_CLAY]: {
            default: 50000,
            updates: [
                UPDATES.PRESERVE_RESOURSES
            ],
            inputType: 'number',
            min: 0,
            max: 600000
        },
        [SETTINGS.PRESERVE_IRON]: {
            default: 50000,
            updates: [
                UPDATES.PRESERVE_RESOURSES
            ],
            inputType: 'number',
            min: 0,
            max: 600000
        },
        [SETTINGS.ENABLED_GROUPS]: {
            default: [],
            updates: [
                UPDATES.GROUPS
            ],
            disabledOption: true,
            inputType: 'select',
            multiSelect: true,
            type: 'groups'
        },
        [SETTINGS.CHECK_INTERVAL]: {
            default: '60 minutes',
            updates: [
                UPDATES.UPDATE_INTERVAL
            ],
            inputType: 'readable_time'
        },
        [SETTINGS.RECRUIT_SINGLE_SPY]: {
            default: true,
            updates: [],
            inputType: 'checkbox'
        }
    };
});
