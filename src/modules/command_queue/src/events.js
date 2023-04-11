define('two/commandQueue/events', [], function () {
    angular.extend(eventTypeProvider, {
        COMMAND_QUEUE_SEND: 'commandqueue_send',
        COMMAND_QUEUE_SEND_TIME_LIMIT: 'commandqueue_send_time_limit',
        COMMAND_QUEUE_SEND_NOT_OWN_VILLAGE: 'commandqueue_send_not_own_village',
        COMMAND_QUEUE_SEND_NO_UNITS_ENOUGH: 'commandqueue_send_no_units_enough',
        COMMAND_QUEUE_ADD: 'commandqueue_add',
        COMMAND_QUEUE_ADD_INVALID_ORIGIN: 'commandqueue_add_invalid_origin',
        COMMAND_QUEUE_ADD_INVALID_TARGET: 'commandqueue_add_invalid_target',
        COMMAND_QUEUE_ADD_INVALID_DATE: 'commandqueue_add_invalid_date',
        COMMAND_QUEUE_ADD_NO_UNITS: 'commandqueue_add_no_units',
        COMMAND_QUEUE_ADD_ALREADY_SENT: 'commandqueue_add_already_sent',
        COMMAND_QUEUE_ADD_RELOCATE_DISABLED: 'command_queue_add_relocate_disabled',
        COMMAND_QUEUE_REMOVE: 'commandqueue_remove',
        COMMAND_QUEUE_REMOVE_ERROR: 'commandqueue_remove_error',
        COMMAND_QUEUE_START: 'commandqueue_start',
        COMMAND_QUEUE_STOP: 'commandqueue_stop'
    });
});
