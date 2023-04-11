define('two/builderQueue/settings', [], function () {
    return {
        GROUP_VILLAGES: 'group_villages',
        ACTIVE_SEQUENCE: 'building_sequence',
        BUILDING_SEQUENCES: 'building_orders',
        PRESERVE_WOOD: 'preserve_wood',
        PRESERVE_CLAY: 'preserve_clay',
        PRESERVE_IRON: 'preserve_iron',
        PRIORIZE_FARM: 'priorize_farm'
    };
});

define('two/builderQueue/settings/updates', [], function () {
    return {
        ANALYSE: 'analyse'
    };
});

define('two/builderQueue/settings/map', [
    'two/builderQueue/defaultOrders',
    'two/builderQueue/settings',
    'two/builderQueue/settings/updates'
], function (
    DEFAULT_ORDERS,
    SETTINGS,
    UPDATES
) {
    return {
        [SETTINGS.GROUP_VILLAGES]: {
            default: false,
            inputType: 'select',
            disabledOption: true,
            type: 'groups',
            updates: [UPDATES.ANALYSE]
        },
        [SETTINGS.ACTIVE_SEQUENCE]: {
            default: 'Essential',
            inputType: 'select',
            updates: [UPDATES.ANALYSE]
        },
        [SETTINGS.BUILDING_SEQUENCES]: {
            default: DEFAULT_ORDERS,
            inputType: 'buildingOrder',
            updates: [UPDATES.ANALYSE]
        },
        [SETTINGS.PRESERVE_WOOD]: {
            default: 0,
            updates: [UPDATES.ANALYSE],
            inputType: 'number',
            min: 0,
            max: 600000
        },
        [SETTINGS.PRESERVE_CLAY]: {
            default: 0,
            updates: [UPDATES.ANALYSE],
            inputType: 'number',
            min: 0,
            max: 600000
        },
        [SETTINGS.PRESERVE_IRON]: {
            default: 0,
            updates: [UPDATES.ANALYSE],
            inputType: 'number',
            min: 0,
            max: 600000
        },
        [SETTINGS.PRIORIZE_FARM]: {
            default: true,
            inputType: 'checkbox',
            updates: [UPDATES.ANALYSE]
        }
    };
});
