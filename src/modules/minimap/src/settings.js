define('two/minimap/settings', [], function () {
    return {
        MAP_SIZE: 'map_size',
        RIGHT_CLICK_ACTION: 'right_click_action',
        FLOATING_MINIMAP: 'floating_minimap',
        SHOW_VIEW_REFERENCE: 'show_view_reference',
        SHOW_CONTINENT_DEMARCATIONS: 'show_continent_demarcations',
        SHOW_PROVINCE_DEMARCATIONS: 'show_province_demarcations',
        SHOW_BARBARIANS: 'show_barbarians',
        SHOW_ONLY_CUSTOM_HIGHLIGHTS: 'show_only_custom_highlights',
        HIGHLIGHT_OWN: 'highlight_own',
        HIGHLIGHT_SELECTED: 'highlight_selected',
        HIGHLIGHT_DIPLOMACY: 'highlight_diplomacy',
        COLOR_GHOST: 'color_ghost',
        COLOR_QUICK_HIGHLIGHT: 'color_quick_highlight',
        COLOR_BACKGROUND: 'color_background',
        COLOR_PROVINCE: 'color_province',
        COLOR_CONTINENT: 'color_continent',
        COLOR_VIEW_REFERENCE: 'color_view_reference'
    };
});

define('two/minimap/settings/updates', function () {
    return {
        MINIMAP: 'minimap',
        MAP_POSITION: 'map_position'
    };
});

define('two/minimap/settings/map', [
    'two/minimap/settings',
    'two/minimap/types/actions',
    'two/minimap/types/mapSizes',
    'two/minimap/settings/updates'
], function (
    SETTINGS,
    ACTION_TYPES,
    MAP_SIZES,
    UPDATES
) {
    return {
        [SETTINGS.MAP_SIZE]: {
            default: MAP_SIZES.SMALL,
            inputType: 'select',
            updates: [UPDATES.MINIMAP, UPDATES.MAP_POSITION],
            disabledOption: false
        },
        [SETTINGS.RIGHT_CLICK_ACTION]: {
            default: ACTION_TYPES.HIGHLIGHT_PLAYER,
            inputType: 'select',
            disabledOption: false
        },
        [SETTINGS.SHOW_VIEW_REFERENCE]: {
            default: true,
            inputType: 'checkbox',
            updates: [UPDATES.MINIMAP]
        },
        [SETTINGS.SHOW_CONTINENT_DEMARCATIONS]: {
            default: false,
            inputType: 'checkbox',
            updates: [UPDATES.MINIMAP]
        },
        [SETTINGS.SHOW_PROVINCE_DEMARCATIONS]: {
            default: true,
            inputType: 'checkbox',
            updates: [UPDATES.MINIMAP]
        },
        [SETTINGS.SHOW_BARBARIANS]: {
            default: false,
            inputType: 'checkbox',
            updates: [UPDATES.MINIMAP]
        },
        [SETTINGS.SHOW_ONLY_CUSTOM_HIGHLIGHTS]: {
            default: false,
            inputType: 'checkbox',
            updates: [UPDATES.MINIMAP]
        },
        [SETTINGS.HIGHLIGHT_OWN]: {
            default: true,
            inputType: 'checkbox',
            updates: [UPDATES.MINIMAP]
        },
        [SETTINGS.HIGHLIGHT_SELECTED]: {
            default: true,
            inputType: 'checkbox',
            updates: [UPDATES.MINIMAP]
        },
        [SETTINGS.HIGHLIGHT_DIPLOMACY]: {
            default: true,
            inputType: 'checkbox',
            updates: [UPDATES.MINIMAP]
        },
        [SETTINGS.COLOR_SELECTED]: {
            default: '#ffffff',
            inputType: 'color',
            updates: [UPDATES.MINIMAP]
        },
        [SETTINGS.COLOR_BARBARIAN]: {
            default: '#969696',
            inputType: 'color',
            updates: [UPDATES.MINIMAP]
        },
        [SETTINGS.COLOR_PLAYER]: {
            default: '#f0c800',
            inputType: 'color',
            updates: [UPDATES.MINIMAP]
        },
        [SETTINGS.COLOR_QUICK_HIGHLIGHT]: {
            default: '#ffffff',
            inputType: 'color',
            updates: [UPDATES.MINIMAP]
        },
        [SETTINGS.COLOR_BACKGROUND]: {
            default: '#436213',
            inputType: 'color',
            updates: [UPDATES.MINIMAP]
        },
        [SETTINGS.COLOR_PROVINCE]: {
            default: '#74c374',
            inputType: 'color',
            updates: [UPDATES.MINIMAP]
        },
        [SETTINGS.COLOR_CONTINENT]: {
            default: '#74c374',
            inputType: 'color',
            updates: [UPDATES.MINIMAP]
        },
        [SETTINGS.COLOR_VIEW_REFERENCE]: {
            default: '#999999',
            inputType: 'color',
            updates: [UPDATES.MINIMAP]
        },
        [SETTINGS.COLOR_TRIBE]: {
            default: '#0000DB',
            inputType: 'color',
            updates: [UPDATES.MINIMAP]
        },
        [SETTINGS.COLOR_ALLY]: {
            default: '#00a0f4',
            inputType: 'color',
            updates: [UPDATES.MINIMAP]
        },
        [SETTINGS.COLOR_ENEMY]: {
            default: '#ED1212',
            inputType: 'color',
            updates: [UPDATES.MINIMAP]
        },
        [SETTINGS.COLOR_FRIENDLY]: {
            default: '#BF4DA4',
            inputType: 'color',
            updates: [UPDATES.MINIMAP]
        },
        [SETTINGS.COLOR_GHOST]: {
            default: '#3E551C',
            inputType: 'color',
            updates: [UPDATES.MINIMAP]
        }
    };
});
