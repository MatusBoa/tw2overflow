define('two/farmOverflow/types/errors', [], function () {
    return {
        NO_PRESETS: 'no_presets',
        USER_STOP: 'user_stop',
        KILL_FARMER: 'kill_farmer',
        ALREADY_RUNNING: 'already_running',
        NO_SELECTED_PRESET: 'no_selected_preset'
    };
});

define('two/farmOverflow/types/status', [], function () {
    return {
        TIME_LIMIT: 'time_limit',
        COMMAND_LIMIT: 'command_limit',
        FULL_STORAGE: 'full_storage',
        NO_UNITS: 'no_units',
        NO_SELECTED_VILLAGE: 'no_selected_village',
        ABANDONED_CONQUERED: 'abandoned_conquered',
        PROTECTED_VILLAGE: 'protected_village',
        BUSY_TARGET: 'busy_target',
        NO_TARGETS: 'no_targets',
        TARGET_CYCLE_END: 'target_cycle_end',
        FARMER_CYCLE_END: 'farmer_cycle_end',
        COMMAND_ERROR: 'command_error',
        NOT_ALLOWED_POINTS: 'not_allowed_points',
        UNKNOWN: 'unknown',
        ATTACKING: 'attacking',
        WAITING_CYCLE: 'waiting_cycle',
        USER_STOP: 'user_stop',
        EXPIRED_STEP: 'expired_step'
    };
});

define('two/farmOverflow/types/logs', [], function () {
    return {
        FARM_START: 'farm_start',
        FARM_STOP: 'farm_stop',
        IGNORED_VILLAGE: 'ignored_village',
        INCLUDED_VILLAGE: 'included_village',
        IGNORED_VILLAGE_REMOVED: 'ignored_village_removed',
        INCLUDED_VILLAGE_REMOVED: 'included_village_removed',
        ATTACKED_VILLAGE: 'attacked_village'
    };
});

define('two/farmOverflow/types/farmerBehavior', [], function () {
    return {
        ALLOW_SINGLE_ATTACK_EACH_TARGET: 'allow_single_attack_each_target',
        ALLOW_MULTIPLE_ATTACK_EACH_TARGET: 'allow_multiple_attack_each_target'
    };
});

define('two/farmOverflow/types/targetBehavior', [], function () {
    return {
        TARGETS_ALLOW_SINGLE_FARMER: 'targets_allow_single_farmer',
        TARGETS_ALLOW_MULTIPLE_FARMERS: 'targets_allow_multiple_farmers'
    };
});
