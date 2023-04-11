define('two/attackView/types/columns', [], function () {
    return {
        'ORIGIN_VILLAGE': 'origin_village_name',
        'COMMAND_TYPE': 'command_type',
        'TARGET_VILLAGE': 'target_village_name',
        'TIME_COMPLETED': 'time_completed',
        'ORIGIN_CHARACTER': 'origin_character_name'
    };
});

define('two/attackView/types/commands', [], function () {
    return {
        'ATTACK': 'attack',
        'SUPPORT': 'support',
        'RELOCATE': 'relocate'
    };
});

define('two/attackView/types/filters', [], function () {
    return {
        'COMMAND_TYPES': 'command_types',
        'VILLAGE': 'village',
        'INCOMING_UNITS': 'incoming_units'
    };
});
