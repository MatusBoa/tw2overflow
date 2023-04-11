define('two/attackView', [
    'two/ready',
    'two/utils',
    'two/attackView/types/columns',
    'two/attackView/types/commands',
    'two/attackView/types/filters',
    'two/attackView/unitSpeedOrder',
    'conf/unitTypes',
    'conf/buildingTypes',
    'Lockr',
    'helper/math',
    'helper/mapconvert',
    'struct/MapData',
    'queues/EventQueue'
], function (
    ready,
    utils,
    COLUMN_TYPES,
    COMMAND_TYPES,
    FILTER_TYPES,
    UNIT_SPEED_ORDER,
    UNIT_TYPES,
    BUILDING_TYPES,
    Lockr,
    math,
    convert,
    mapData,
    eventQueue
) {
    let initialized = false;
    const overviewService = injector.get('overviewService');
    let globalInfoModel;
    let commands = [];
    let commandQueue = false;
    let filters = {};
    let filterParams = {};
    const sorting = {
        reverse: false,
        column: COLUMN_TYPES.TIME_COMPLETED
    };
    let COMMAND_QUEUE_DATE_TYPES;
    const STORAGE_KEYS = {
        FILTERS: 'attack_view_filters'
    };
    const INCOMING_UNITS_FILTER = {};
    const COMMAND_TYPES_FILTER = {};

    const formatFilters = function () {
        const toArray = [FILTER_TYPES.COMMAND_TYPES];
        const currentVillageId = modelDataService.getSelectedVillage().getId();
        const arrays = {};

        // format filters for backend
        for (let i = 0; i < toArray.length; i++) {
            for (const j in filters[toArray[i]]) {
                if (!arrays[toArray[i]]) {
                    arrays[toArray[i]] = [];
                }

                if (filters[toArray[i]][j]) {
                    switch (toArray[i]) {
                        case FILTER_TYPES.COMMAND_TYPES: {
                            if (j === COMMAND_TYPES.ATTACK) {
                                arrays[toArray[i]].push(COMMAND_TYPES.ATTACK);
                            } else if (j === COMMAND_TYPES.SUPPORT) {
                                arrays[toArray[i]].push(COMMAND_TYPES.SUPPORT);
                            } else if (j === COMMAND_TYPES.RELOCATE) {
                                arrays[toArray[i]].push(COMMAND_TYPES.RELOCATE);
                            }
                            break;
                        }
                    }
                }
            }
        }

        filterParams = arrays;
        filterParams.village = filters[FILTER_TYPES.VILLAGE] ? [currentVillageId] : [];
    };

    /**
     * Command was sent.
     */
    const onCommandIncomming = function () {
        // we can never know if the command is currently visible (because of filters, sorting and stuff) -> reload
        attackView.loadCommands();
    };

    /**
     * Command was cancelled.
     *
     * @param {Object} event unused
     * @param {Object} data The backend-data
     */
    const onCommandCancelled = function (event, data) {
        eventQueue.trigger(eventTypeProvider.ATTACK_VIEW_COMMAND_CANCELLED, [data.id || data.command_id]);
    };

    /**
     * Command ignored.
     *
     * @param {Object} event unused
     * @param {Object} data The backend-data
     */
    const onCommandIgnored = function (event, data) {
        for (let i = 0; i < commands.length; i++) {
            if (commands[i].command_id === data.command_id) {
                commands.splice(i, 1);
            }
        }

        eventQueue.trigger(eventTypeProvider.ATTACK_VIEW_COMMAND_IGNORED, [data.command_id]);
    };

    /**
     * Village name changed.
     *
     * @param {Object} event unused
     * @param {Object} data The backend-data
     */
    const onVillageNameChanged = function (event, data) {
        for (let i = 0; i < commands.length; i++) {
            if (commands[i].target_village_id === data.village_id) {
                commands[i].target_village_name = data.name;
                commands[i].targetVillage.name = data.name;
            } else if (commands[i].origin_village_id === data.village_id) {
                commands[i].origin_village_name = data.name;
                commands[i].originVillage.name = data.name;
            }
        }

        eventQueue.trigger(eventTypeProvider.ATTACK_VIEW_VILLAGE_RENAMED, [data]);
    };

    const onVillageSwitched = function (e, newVillageId) {
        if (filterParams[FILTER_TYPES.VILLAGE].length) {
            filterParams[FILTER_TYPES.VILLAGE] = [newVillageId];

            attackView.loadCommands();
        }
    };

    /**
     * @param {CommandModel} command
     * @return {String} Slowest unit
     */
    const getSlowestUnit = function (command) {
        const origin = {
            x: command.origin_x,
            y: command.origin_y
        };
        const target = {
            x: command.target_x,
            y: command.target_y
        };
        const unitDurationDiff = UNIT_SPEED_ORDER.map(function (unit) {
            const travelTime = utils.getTravelTime(origin, target, {[unit]: 1}, command.command_type, {}, false);
            const durationDiff = Math.abs(travelTime - command.model.duration);

            return {
                unit: unit,
                diff: durationDiff
            };
        }).sort(function (a, b) {
            return a.diff - b.diff;
        });

        return unitDurationDiff[0].unit;
    };

    /**
     * Sort a set of villages by distance from a specified village.
     *
     * @param {Array[{x: Number, y: Number}]} villages List of village that will be sorted.
     * @param {VillageModel} origin
     * @return {Array} Sorted villages
     */
    const sortByDistance = function (villages, origin) {
        return villages.sort(function (villageA, villageB) {
            const distA = math.actualDistance(origin, villageA);
            const distB = math.actualDistance(origin, villageB);

            return distA - distB;
        });
    };

    /**
     * Order:
     * - Barbarian villages.
     * - Own villages.
     * - Tribe villages.
     *
     * @param {VillageModel} origin
     * @param {Function} callback
     */
    const closestNonHostileVillage = function (origin, callback) {
        const size = 25;
        let loadBlockIndex = 0;

        if (mapData.hasTownDataInChunk(origin.x, origin.y)) {
            const sectors = mapData.loadTownData(origin.x, origin.y, size, size, size);
            const tribeId = modelDataService.getSelectedCharacter().getTribeId();
            const playerId = modelDataService.getSelectedCharacter().getId();
            const targets = [];
            let closestTargets;

            sectors.forEach(function (sector) {
                for (const x in sector.data) {
                    for (const y in sector.data[x]) {
                        targets.push(sector.data[x][y]);
                    }
                }
            });


            const barbs = targets.filter(function (target) {
                return target.character_id === null && target.id > 0;
            });

            const own = targets.filter(function (target) {
                return target.character_id === playerId && origin.id !== target.id;
            });

            if (barbs.length) {
                closestTargets = sortByDistance(barbs, origin);
            } else if (own.length) {
                closestTargets = sortByDistance(own, origin);
            } else if (tribeId) {
                const tribe = targets.filter(function (target) {
                    return target.tribe_id === tribeId;
                });

                if (tribe.length) {
                    closestTargets = sortByDistance(tribe, origin);
                } else {
                    return callback(false);
                }
            } else {
                return callback(false);
            }

            return callback(closestTargets[0]);
        }
        
        const loads = convert.scaledGridCoordinates(origin.x, origin.y, size, size, size);

        mapData.loadTownDataAsync(origin.x, origin.y, size, size, function () {
            if (++loadBlockIndex === loads.length) {
                closestNonHostileVillage(origin, callback);
            }
        });
    };

    /**
     * @param {Object} data The data-object from the backend
     */
    const onOverviewIncomming = function (data) {
        commands = data.commands;

        for (let i = 0; i < commands.length; i++) {
            overviewService.formatCommand(commands[i]);
            commands[i].slowestUnit = getSlowestUnit(commands[i]);
        }

        commands = commands.filter(function (command) {
            return filters[FILTER_TYPES.INCOMING_UNITS][command.slowestUnit];
        });

        eventQueue.trigger(eventTypeProvider.ATTACK_VIEW_COMMANDS_LOADED, [commands]);
    };

    const attackView = {};

    attackView.loadCommands = function () { 
        const incomingCommands = globalInfoModel.getCommandListModel().getIncomingCommands().length;
        const count = incomingCommands > 25 ? incomingCommands : 25;

        socketService.emit(routeProvider.OVERVIEW_GET_INCOMING, {
            'count': count,
            'offset': 0,
            'sorting': sorting.column,
            'reverse': sorting.reverse ? 1 : 0,
            'groups': [],
            'command_types': filterParams[FILTER_TYPES.COMMAND_TYPES],
            'villages': filterParams[FILTER_TYPES.VILLAGE]
        }, onOverviewIncomming);
    };

    attackView.getCommands = function () {
        return commands;
    };

    attackView.getFilters = function () {
        return filters;
    };

    attackView.getSortings = function () {
        return sorting;
    };

    /**
     * Toggles the given filter.
     *
     * @param {string} type The category of the filter (see FILTER_TYPES)
     * @param {string} opt_filter The filter to be toggled.
     */
    attackView.toggleFilter = function (type, opt_filter) {
        if (!opt_filter) {
            filters[type] = !filters[type];
        } else {
            filters[type][opt_filter] = !filters[type][opt_filter];
        }

        // format filters for the backend
        formatFilters();
        Lockr.set(STORAGE_KEYS.FILTERS, filters);
        attackView.loadCommands();
    };

    attackView.toggleSorting = function (newColumn) {
        if (newColumn === sorting.column) {
            sorting.reverse = !sorting.reverse;
        } else {
            sorting.column = newColumn;
            sorting.reverse = false;
        }

        attackView.loadCommands();
    };

    /**
     * Set an automatic command with all units from the village
     * and start the CommandQueue module if it's disabled.
     *
     * @param {Object} command Data of the command like origin, target.
     * @param {String} date Date that the command has to leave.
     */
    attackView.setCommander = function (command, date) {
        closestNonHostileVillage(command.targetVillage, function (closestVillage) {
            const origin = command.targetVillage;
            const target = closestVillage;
            const commandType = target.character_id ? COMMAND_TYPES.SUPPORT : COMMAND_TYPES.ATTACK;
            const units = {};

            utils.each(UNIT_TYPES, function (unit) {
                units[unit] = '*';
            });

            commandQueue.addCommand(origin, target, date, COMMAND_QUEUE_DATE_TYPES.OUT, units, {}, commandType, BUILDING_TYPES.WALL);

            if (!commandQueue.isRunning()) {
                commandQueue.start();
            }
        });
    };

    attackView.commandQueueEnabled = function () {
        return !!commandQueue;
    };

    attackView.isInitialized = function () {
        return initialized;
    };

    attackView.init = function () {
        for (let i = 0; i < UNIT_SPEED_ORDER.length; i++) {
            INCOMING_UNITS_FILTER[UNIT_SPEED_ORDER[i]] = true;
        }

        for (const i in COMMAND_TYPES) {
            COMMAND_TYPES_FILTER[COMMAND_TYPES[i]] = true;
        }

        try {
            commandQueue = require('two/commandQueue');
            COMMAND_QUEUE_DATE_TYPES = require('two/commandQueue/types/dates');
        } catch (e) {}

        const defaultFilters = {
            [FILTER_TYPES.COMMAND_TYPES]: angular.copy(COMMAND_TYPES_FILTER),
            [FILTER_TYPES.INCOMING_UNITS]: angular.copy(INCOMING_UNITS_FILTER),
            [FILTER_TYPES.VILLAGE]: false
        };

        initialized = true;
        globalInfoModel = modelDataService.getSelectedCharacter().getGlobalInfo();
        filters = Lockr.get(STORAGE_KEYS.FILTERS, defaultFilters, true);

        ready(function () {
            formatFilters();

            $rootScope.$on(eventTypeProvider.COMMAND_INCOMING, onCommandIncomming);
            $rootScope.$on(eventTypeProvider.COMMAND_CANCELLED, onCommandCancelled);
            $rootScope.$on(eventTypeProvider.MAP_SELECTED_VILLAGE, onVillageSwitched);
            $rootScope.$on(eventTypeProvider.VILLAGE_NAME_CHANGED, onVillageNameChanged);
            $rootScope.$on(eventTypeProvider.COMMAND_IGNORED, onCommandIgnored);

            attackView.loadCommands();
        }, ['initial_village']);
    };

    return attackView;
});
