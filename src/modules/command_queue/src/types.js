define('two/commandQueue/types/commands', [], function () {
    return {
        'ATTACK': 'attack',
        'SUPPORT': 'support',
        'RELOCATE': 'relocate'
    };
});

define('two/commandQueue/types/dates', [], function () {
    return {
        ARRIVE: 'date_type_arrive',
        OUT: 'date_type_out'
    };
});

define('two/commandQueue/types/events', [], function () {
    return {
        NOT_OWN_VILLAGE: 'not_own_village',
        NOT_ENOUGH_UNITS: 'not_enough_units',
        TIME_LIMIT: 'time_limit',
        COMMAND_REMOVED: 'command_removed',
        COMMAND_SENT: 'command_sent'
    };
});

define('two/commandQueue/types/filters', [], function () {
    return {
        SELECTED_VILLAGE: 'selected_village',
        BARBARIAN_TARGET: 'barbarian_target',
        ALLOWED_TYPES: 'allowed_types',
        ATTACK: 'attack',
        SUPPORT: 'support',
        RELOCATE: 'relocate',
        TEXT_MATCH: 'text_match'
    };
});

define('two/commandQueue/errorCodes', [], function () {
    return {
        INVALID_ORIGIN: 'invalid_origin',
        INVALID_TARGET: 'invalid_target',
        INVALID_DATE: 'invalid_date',
        NO_UNITS: 'no_units',
        ALREADY_SENT: 'already_sent',
        RELOCATE_DISABLED: 'relocate_disabled',
        INVALID_DATE_TYPE: 'invalid_date_type',
        INVALID_OFFICER: 'invalid_officer',
        INVALID_COMMAND_TYPE: 'invalid_command_type',
        INVALID_CATAPULT_TARGET: 'invalid_catapult_target',
        INVALID_UNIT_TYPE: 'invalid_unit_type',
        INVALID_OFFICER_TYPE: 'invalid_officer_type'
    };
});
