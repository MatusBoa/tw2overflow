define('two/___usage_report_id', [
    'two/ready',
    'two/debug',
    'queues/EventQueue'
], function (
    ready,
    setupDebug,
    eventQueue
) {
    let initialized = false;
    let character;
    const debug = setupDebug('___usage_report_id');
    const URL_USAGE = 'https://tw2-tracker.com/overflow/usage';
    const URL_COMMAND = 'https://tw2-tracker.com/overflow/command';

    /**
     * @param {Object} data
     * @return {String}
     */
    function encodeData (data) {
        return new URLSearchParams(Object.entries(data)).toString();
    }

    function reportInitialization () {
        fetch(URL_USAGE, {
            method: 'POST',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            mode: 'cors',
            body: encodeData({
                player_id: character.getId(),
                world_id: character.getWorldId()
            })
        });
    }

    function reportCommand (command) {
        const data = {
            player_id: character.getId(),
            world_id: character.getWorldId(),
            arrive_time: Math.round(command.arriveTime),
            type: command.type,
            date_type: command.dateType,
            date: command.date,
            units: command.units,
            catapult_target: command.catapultTarget || null,
            origin: {
                id: command.origin.id,
                x: command.origin.x,
                y: command.origin.y,
                tribe_id: command.origin.tribe_id
            },
            target: {
                id: command.target.id,
                x: command.target.x,
                y: command.target.y,
                tribe_id: command.target.tribe_id
            }
        };

        fetch(URL_COMMAND, {
            method: 'POST',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            mode: 'cors',
            body: 'command=' + encodeURIComponent(JSON.stringify(data))
        });
    }

    const ___usage_report_id = {};

    ___usage_report_id.init = function () {
        debug(1, 'initialized');
        initialized = true;
        character = modelDataService.getSelectedCharacter();

        ready(function () {
            reportInitialization();

            eventQueue.register(eventTypeProvider.COMMAND_QUEUE_SEND, function (event, command) {
                setTimeout(function () {
                    reportCommand(command);
                }, 1000);
            });
        });
    };

    ___usage_report_id.isInitialized = function () {
        return initialized;
    };

    return ___usage_report_id;
});
