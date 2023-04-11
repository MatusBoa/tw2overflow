define('two/attackView/events', [], function () {
    angular.extend(eventTypeProvider, {
        ATTACK_VIEW_FILTERS_CHANGED: 'attack_view_filters_changed',
        ATTACK_VIEW_SORTING_CHANGED: 'attack_view_sorting_changed',
        ATTACK_VIEW_COMMAND_CANCELLED: 'attack_view_command_cancelled',
        ATTACK_VIEW_COMMAND_IGNORED: 'attack_view_command_ignored',
        ATTACK_VIEW_VILLAGE_RENAMED: 'attack_view_village_renamed',
        ATTACK_VIEW_COMMANDS_LOADED: 'attack_view_commands_loaded'
    });
});
