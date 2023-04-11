define('two/commandQueue', [
    'two/utils',
    'two/commandQueue/types/dates',
    'two/commandQueue/types/events',
    'two/commandQueue/types/filters',
    'two/commandQueue/types/commands',
    'two/commandQueue/storageKeys',
    'two/commandQueue/errorCodes',
    'queues/EventQueue',
    'helper/time',
    'helper/math',
    'struct/MapData',
    'Lockr',
    'conf/buildingTypes',
    'conf/officerTypes',
    'conf/unitTypes'
], function (
    utils,
    DATE_TYPES,
    EVENT_CODES,
    FILTER_TYPES,
    COMMAND_TYPES,
    STORAGE_KEYS,
    ERROR_CODES,
    eventQueue,
    timeHelper,
    $math,
    mapData,
    Lockr,
    BUILDING_TYPES,
    OFFICER_TYPES,
    UNIT_TYPES
) {
    const CHECKS_PER_SECOND = 10;
    const COMMAND_TYPE_LIST = Object.values(COMMAND_TYPES);
    const DATE_TYPE_LIST = Object.values(DATE_TYPES);
    const UNIT_TYPE_LIST = Object.values(UNIT_TYPES);
    const OFFICER_TYPE_LIST = Object.values(OFFICER_TYPES);
    const BUILDING_TYPE_LIST = Object.values(BUILDING_TYPES);
    let waitingCommands = [];
    const waitingCommandsObject = {};
    let sentCommands = [];
    let expiredCommands = [];
    let running = false;
    let timeOffset;

    const commandFilters = {
        [FILTER_TYPES.SELECTED_VILLAGE]: function (command) {
            return command.origin.id === modelDataService.getSelectedVillage().getId();
        },
        [FILTER_TYPES.BARBARIAN_TARGET]: function (command) {
            return !command.target.character_id;
        },
        [FILTER_TYPES.ALLOWED_TYPES]: function (command, options) {
            return options[FILTER_TYPES.ALLOWED_TYPES][command.type];
        },
        [FILTER_TYPES.ATTACK]: function (command) {
            return command.type !== COMMAND_TYPES.ATTACK;
        },
        [FILTER_TYPES.SUPPORT]: function (command) {
            return command.type !== COMMAND_TYPES.SUPPORT;
        },
        [FILTER_TYPES.RELOCATE]: function (command) {
            return command.type !== COMMAND_TYPES.RELOCATE;
        },
        [FILTER_TYPES.TEXT_MATCH]: function (command, options) {
            const keywords = options[FILTER_TYPES.TEXT_MATCH].toLowerCase().split(/\W/);

            const searchString = [
                command.origin.name,
                command.origin.x + '|' + command.origin.y,
                command.origin.character_name || '',
                command.target.name,
                command.target.x + '|' + command.target.y,
                command.target.character_name || '',
                command.target.tribe_name || '',
                command.target.tribe_tag || ''
            ].join('').toLowerCase();

            for (const keyword of keywords) {
                if (keyword.length && !searchString.includes(keyword)) {
                    return false;
                }
            }

            return true;
        }
    };

    const timeToSend = function (sendTime) {
        return sendTime < (timeHelper.gameTime() + timeOffset);
    };

    const sortWaitingQueue = function () {
        waitingCommands = waitingCommands.sort(function (a, b) {
            return a.sendTime - b.sendTime;
        });
    };

    const pushWaitingCommand = function (command) {
        waitingCommands.push(command);
    };

    const pushCommandObject = function (command) {
        waitingCommandsObject[command.id] = command;
    };

    const pushSentCommand = function (command) {
        sentCommands.push(command);
    };

    const pushExpiredCommand = function (command) {
        expiredCommands.push(command);
    };

    const storeWaitingQueue = function () {
        Lockr.set(STORAGE_KEYS.QUEUE_COMMANDS, waitingCommands);
    };

    const storeSentQueue = function () {
        Lockr.set(STORAGE_KEYS.QUEUE_SENT, sentCommands);
    };

    const storeExpiredQueue = function () {
        Lockr.set(STORAGE_KEYS.QUEUE_EXPIRED, expiredCommands);
    };

    const loadStoredCommands = function () {
        const storedQueue = Lockr.get(STORAGE_KEYS.QUEUE_COMMANDS, [], true);

        utils.each(storedQueue, function (command) {
            if (timeHelper.gameTime() > command.sendTime) {
                commandQueue.expireCommand(command, EVENT_CODES.TIME_LIMIT);
            } else {
                pushWaitingCommand(command);
                pushCommandObject(command);
            }
        });
    };
    

    const parseDynamicUnits = function (command) {
        const playerVillages = modelDataService.getVillages();
        const village = playerVillages[command.origin.id];

        if (!village) {
            return EVENT_CODES.NOT_OWN_VILLAGE;
        }

        const villageUnits = village.unitInfo.units;
        const parsedUnits = {};
        let error = false;

        utils.each(command.units, function (amount, unit) {
            if (amount === '*') {
                amount = villageUnits[unit].available;

                if (amount === 0) {
                    return;
                }
            } else if (amount < 0) {
                amount = villageUnits[unit].available - Math.abs(amount);

                if (amount < 0) {
                    error = EVENT_CODES.NOT_ENOUGH_UNITS;
                    return false;
                }
            } else if (amount > 0) {
                if (amount > villageUnits[unit].available) {
                    error = EVENT_CODES.NOT_ENOUGH_UNITS;
                    return false;
                }
            }

            parsedUnits[unit] = amount;
        });

        if (angular.equals({}, parsedUnits)) {
            error = EVENT_CODES.NOT_ENOUGH_UNITS;
        }

        return error || parsedUnits;
    };

    const listenCommands = function () {
        setInterval(function () {
            if (!waitingCommands.length) {
                return;
            }

            for (const command of waitingCommands) {
                if (timeToSend(command.sendTime)) {
                    if (running) {
                        commandQueue.sendCommand(command);
                    } else {
                        commandQueue.expireCommand(command, EVENT_CODES.TIME_LIMIT);
                    }
                } else {
                    break;
                }
            }
        }, 1000 / CHECKS_PER_SECOND);
    };

    const validAxisCoord = function (input) {
        return !isNaN(input) && input > 0 && input < 1000;
    };

    const validCoords = function (input) {
        return hasOwn.call(input, 'x') && hasOwn.call(input, 'y') && validAxisCoord(input.x) && validAxisCoord(input.y);
    };

    const commandQueue = {
        initialized: false
    };

    commandQueue.init = function () {
        timeOffset = utils.getTimeOffset();
        commandQueue.initialized = true;
        sentCommands = Lockr.get(STORAGE_KEYS.QUEUE_SENT, [], true);
        expiredCommands = Lockr.get(STORAGE_KEYS.QUEUE_EXPIRED, [], true);

        loadStoredCommands();
        listenCommands();

        window.addEventListener('beforeunload', function (event) {
            if (running && waitingCommands.length) {
                event.returnValue = true;
            }
        });
    };

    commandQueue.sendCommand = function (command) {
        const units = parseDynamicUnits(command);

        // units === EVENT_CODES.*
        if (typeof units === 'string') {
            return commandQueue.expireCommand(command, units);
        }

        command.units = units;

        socketService.emit(routeProvider.SEND_CUSTOM_ARMY, {
            start_village: command.origin.id,
            target_village: command.target.id,
            type: command.type,
            units: command.units,
            icon: 0,
            officers: command.officers,
            catapult_target: command.catapultTarget
        });

        pushSentCommand(command);
        storeSentQueue();

        commandQueue.removeCommand(command, EVENT_CODES.COMMAND_SENT);
        eventQueue.trigger(eventTypeProvider.COMMAND_QUEUE_SEND, command);
    };

    commandQueue.expireCommand = function (command, eventCode) {
        pushExpiredCommand(command);
        storeExpiredQueue();

        commandQueue.removeCommand(command, eventCode);
    };

    commandQueue.addCommand = function (origin, target, date, dateType, units, officers, commandType, catapultTarget) {
        const parsedUnits = {};
        const parsedOfficers = {};

        return new Promise(function (resolve, reject) {
            if (!validCoords(origin)) {
                return reject(ERROR_CODES.INVALID_ORIGIN);
            }

            if (!validCoords(target)) {
                return reject(ERROR_CODES.INVALID_TARGET);
            }

            if (!utils.isValidDateTime(date)) {
                return reject(ERROR_CODES.INVALID_DATE);
            }

            if (angular.isObject(units)) {
                const validUnitType = utils.each(units, function (amount, unitName) {
                    if (!UNIT_TYPE_LIST.includes(unitName)) {
                        return false;
                    }

                    amount = isNaN(amount) ? amount : parseInt(amount, 10);

                    if (amount === '*' || typeof amount === 'number' && amount !== 0) {
                        parsedUnits[unitName] = amount;
                    }
                });

                if (!validUnitType) {
                    return reject(ERROR_CODES.INVALID_UNIT_TYPE);
                }
            }

            if (angular.equals(parsedUnits, {})) {
                return reject(ERROR_CODES.NO_UNITS);
            }

            if (angular.isObject(officers)) {
                const validOfficerType = utils.each(officers, function (status, officerName) {
                    if (!OFFICER_TYPE_LIST.includes(officerName)) {
                        return false;
                    }

                    if (officers[officerName]) {
                        parsedOfficers[officerName] = true;
                    }
                });

                if (!validOfficerType) {
                    return reject(ERROR_CODES.INVALID_OFFICER_TYPE);
                }
            }

            if (!COMMAND_TYPE_LIST.includes(commandType)) {
                return reject(ERROR_CODES.INVALID_COMMAND_TYPE);
            }

            if (commandType === COMMAND_TYPES.RELOCATE && !modelDataService.getWorldConfig().isRelocateUnitsEnabled()) {
                return reject(ERROR_CODES.RELOCATE_DISABLED);
            }

            if (commandType === COMMAND_TYPES.ATTACK && parsedOfficers[OFFICER_TYPES.SUPPORTER]) {
                delete parsedOfficers[OFFICER_TYPES.SUPPORTER];
            }

            if (typeof catapultTarget === 'string' && !BUILDING_TYPE_LIST.includes(catapultTarget)) {
                return reject(ERROR_CODES.INVALID_CATAPULT_TARGET);
            }

            if (commandType === COMMAND_TYPES.ATTACK && parsedUnits[UNIT_TYPES.CATAPULT]) {
                catapultTarget = catapultTarget || BUILDING_TYPES.HEADQUARTER;
            } else {
                catapultTarget = false;
            }

            if (!DATE_TYPE_LIST.includes(dateType)) {
                return reject(ERROR_CODES.INVALID_DATE_TYPE);
            }

            Promise.all([
                new Promise((resolve) => mapData.loadTownDataAsync(origin.x, origin.y, 1, 1, resolve)),
                new Promise((resolve) => mapData.loadTownDataAsync(target.x, target.y, 1, 1, resolve))
            ]).then(function (villages) {
                origin = villages[0];
                target = villages[1];

                if (!origin) {
                    return reject(ERROR_CODES.INVALID_ORIGIN);
                }

                if (!target) {
                    return reject(ERROR_CODES.INVALID_TARGET);
                }

                const inputTime = utils.getTimeFromString(date);
                const travelTime = utils.getTravelTime(origin, target, parsedUnits, commandType, parsedOfficers, true);
                const sendTime = dateType === DATE_TYPES.ARRIVE ? (inputTime - travelTime) : inputTime;
                const arriveTime = dateType === DATE_TYPES.ARRIVE ? inputTime : (inputTime + travelTime);

                if (timeToSend(sendTime)) {
                    return reject(ERROR_CODES.ALREADY_SENT);
                }

                const command = {
                    id: utils.guid(),
                    travelTime: travelTime,
                    arriveTime: arriveTime,
                    sendTime: sendTime,
                    origin: origin,
                    target: target,
                    date: date,
                    dateType: dateType,
                    units: parsedUnits,
                    officers: parsedOfficers,
                    type: commandType,
                    catapultTarget: catapultTarget,
                    countdown: sendTime - timeHelper.gameTime()
                };

                pushWaitingCommand(command);
                pushCommandObject(command);
                sortWaitingQueue();
                storeWaitingQueue();
                resolve(command);
            });
        });
    };

    commandQueue.removeCommand = function (command, eventCode) {
        delete waitingCommandsObject[command.id];

        const removed = waitingCommands.some(function (waitingCommand, index) {
            if (waitingCommand.id == command.id) {
                waitingCommands.splice(index, 1);
                storeWaitingQueue();
                return true;
            }
            return false;
        });

        if (removed) {
            switch (eventCode) {
                case EVENT_CODES.TIME_LIMIT: {
                    eventQueue.trigger(eventTypeProvider.COMMAND_QUEUE_SEND_TIME_LIMIT, command);
                    break;
                }
                case EVENT_CODES.NOT_OWN_VILLAGE: {
                    eventQueue.trigger(eventTypeProvider.COMMAND_QUEUE_SEND_NOT_OWN_VILLAGE, command);
                    break;
                }
                case EVENT_CODES.NOT_ENOUGH_UNITS: {
                    eventQueue.trigger(eventTypeProvider.COMMAND_QUEUE_SEND_NO_UNITS_ENOUGH, command);
                    break;
                }
                case EVENT_CODES.COMMAND_REMOVED: {
                    eventQueue.trigger(eventTypeProvider.COMMAND_QUEUE_REMOVE, command);
                    break;
                }
            }
        } else {
            eventQueue.trigger(eventTypeProvider.COMMAND_QUEUE_REMOVE_ERROR, command);
        }

        return removed;
    };

    commandQueue.clearRegisters = function () {
        Lockr.set(STORAGE_KEYS.QUEUE_EXPIRED, []);
        Lockr.set(STORAGE_KEYS.QUEUE_SENT, []);
        expiredCommands = [];
        sentCommands = [];
    };

    commandQueue.start = function (disableNotif) {
        running = true;
        eventQueue.trigger(eventTypeProvider.COMMAND_QUEUE_START, {
            disableNotif: !!disableNotif
        });
    };

    commandQueue.stop = function () {
        running = false;
        eventQueue.trigger(eventTypeProvider.COMMAND_QUEUE_STOP);
    };

    commandQueue.isRunning = function () {
        return running;
    };

    commandQueue.getWaitingCommands = function () {
        return waitingCommands;
    };

    commandQueue.getWaitingCommandsObject = function () {
        return waitingCommandsObject;
    };

    commandQueue.getSentCommands = function () {
        return sentCommands;
    };

    commandQueue.getExpiredCommands = function () {
        return expiredCommands;
    };

    /**
     * @param {Array} _deep - recursive command list
     */
    commandQueue.filterCommands = function (filterId, filterArgs, _deep) {
        const filter = commandFilters[filterId];
        const commands = _deep || waitingCommands;

        return commands.filter(function (command) {
            return filter(command, filterArgs);
        });
    };

    return commandQueue;
});
