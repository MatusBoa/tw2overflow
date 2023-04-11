define('two/builderQueue/events', [], function () {
    angular.extend(eventTypeProvider, {
        BUILDER_QUEUE_JOB_STARTED: 'builder_queue_job_started',
        BUILDER_QUEUE_START: 'builder_queue_start',
        BUILDER_QUEUE_STOP: 'builder_queue_stop',
        BUILDER_QUEUE_UNKNOWN_SETTING: 'builder_queue_settings_unknown_setting',
        BUILDER_QUEUE_CLEAR_LOGS: 'builder_queue_clear_logs',
        BUILDER_QUEUE_BUILDING_SEQUENCES_UPDATED: 'builder_queue_building_orders_updated',
        BUILDER_QUEUE_BUILDING_SEQUENCES_ADDED: 'builder_queue_building_orders_added',
        BUILDER_QUEUE_BUILDING_SEQUENCES_REMOVED: 'builder_queue_building_orders_removed',
        BUILDER_QUEUE_SETTINGS_CHANGE: 'builder_queue_settings_change',
        BUILDER_QUEUE_NO_SEQUENCES: 'builder_queue_no_sequences',
        COMMAND_QUEUE_ADD_INVALID_OFFICER: 'command_queue_add_invalid_officer',
        COMMAND_QUEUE_ADD_RELOCATE_DISABLED: 'command_queue_add_relocate_disabled'
    });
});

