define('two/commandQueue/ui', [
    'two/ui',
    'two/commandQueue',
    'two/EventScope',
    'two/utils',
    'two/commandQueue/types/dates',
    'two/commandQueue/types/events',
    'two/commandQueue/types/filters',
    'two/commandQueue/types/commands',
    'two/commandQueue/storageKeys',
    'two/commandQueue/errorCodes',
    'queues/EventQueue',
    'struct/MapData',
    'helper/time',
    'helper/util',
    'Lockr'
], function (
    interfaceOverflow,
    commandQueue,
    EventScope,
    utils,
    DATE_TYPES,
    EVENT_CODES,
    FILTER_TYPES,
    COMMAND_TYPES,
    STORAGE_KEYS,
    ERROR_CODES,
    eventQueue,
    mapData,
    $timeHelper,
    util,
    Lockr
) {
    let $scope;
    let $button;
    const $gameData = modelDataService.getGameData();
    let $player;
    const orderedUnitNames = $gameData.getOrderedUnitNames();
    const orderedOfficerNames = $gameData.getOrderedOfficerNames();
    const presetList = modelDataService.getPresetList();
    let mapSelectedVillage = false;
    let unitOrder;
    let commandData;
    const TAB_TYPES = {
        ADD: 'add',
        WAITING: 'waiting',
        LOGS: 'logs'
    };
    const DEFAULT_TAB = TAB_TYPES.ADD;
    const DEFAULT_CATAPULT_TARGET = 'wall';
    const attackableBuildingsList = [];
    const unitList = {};
    const officerList = {};
    let timeOffset;
    let activeFilters;
    let filtersData;
    const travelTimeArmy = {
        light_cavalry: {light_cavalry: 1},
        heavy_cavalry: {heavy_cavalry: 1},
        archer: {archer: 1},
        sword: {sword: 1},
        ram: {ram: 1},
        snob: {snob: 1},
        trebuchet: {trebuchet: 1}
    };
    const FILTER_ORDER = [
        FILTER_TYPES.SELECTED_VILLAGE,
        FILTER_TYPES.BARBARIAN_TARGET,
        FILTER_TYPES.ALLOWED_TYPES,
        FILTER_TYPES.TEXT_MATCH
    ];

    const setMapSelectedVillage = function (event, menu) {
        mapSelectedVillage = menu.data;
    };

    const unsetMapSelectedVillage = function () {
        mapSelectedVillage = false;
    };

    /**
     * @param {Number=} _ms - Optional time to be formated instead of the game date.
     * @return {String}
     */
    const formatedDate = function (_ms) {
        const date = new Date(_ms || ($timeHelper.gameTime() + utils.getTimeOffset()));

        const rawMS = date.getMilliseconds();
        const ms = $timeHelper.zerofill(rawMS - (rawMS % 100), 3);
        const sec = $timeHelper.zerofill(date.getSeconds(), 2);
        const min = $timeHelper.zerofill(date.getMinutes(), 2);
        const hour = $timeHelper.zerofill(date.getHours(), 2);
        const day = $timeHelper.zerofill(date.getDate(), 2);
        const month = $timeHelper.zerofill(date.getMonth() + 1, 2);
        const year = date.getFullYear();

        return hour + ':' + min + ':' + sec + ':' + ms + ' ' + day + '/' + month + '/' + year;
    };

    const addDateDiff = function (date, diff) {
        if (!utils.isValidDateTime(date)) {
            return '';
        }

        date = utils.getTimeFromString(date);
        date += diff;

        return formatedDate(date);
    };

    const updateTravelTimes = function () {
        $scope.isValidDate = utils.isValidDateTime(commandData.date);

        if (!commandData.origin || !commandData.target) {
            return;
        }

        const commandTime = $scope.isValidDate ? utils.getTimeFromString(commandData.date) : false;
        const isArrive = $scope.selectedDateType.value === DATE_TYPES.ARRIVE;

        utils.each(COMMAND_TYPES, function (commandType) {
            utils.each(travelTimeArmy, function (army, unit) {
                const travelTime = utils.getTravelTime(commandData.origin, commandData.target, army, commandType, commandData.officers, true);
                
                $scope.travelTimes[commandType][unit].travelTime = $filter('readableMillisecondsFilter')(travelTime);
                $scope.travelTimes[commandType][unit].status = commandTime ? sendTimeStatus(isArrive ? commandTime - travelTime : commandTime) : 'neutral';
            });
        });
    };

    /**
     * @param  {Number}  time - Command date input in milliseconds.
     * @return {Boolean}
     */
    const sendTimeStatus = function (time) {
        if (!time || !$scope.isValidDate) {
            return 'neutral';
        }

        return ($timeHelper.gameTime() + timeOffset) < time ? 'valid' : 'invalid';
    };

    const updateDateType = function () {
        commandData.dateType = $scope.selectedDateType.value;
        Lockr.set(STORAGE_KEYS.LAST_DATE_TYPE, $scope.selectedDateType.value);
        updateTravelTimes();
    };

    const updateCatapultTarget = function () {
        commandData.catapultTarget = $scope.catapultTarget.value;
    };

    const insertPreset = function () {
        const selectedPreset = $scope.selectedInsertPreset.value;

        if (!selectedPreset) {
            return false;
        }

        const presets = modelDataService.getPresetList().getPresets();
        const preset = presets[selectedPreset];

        // reset displayed value
        $scope.selectedInsertPreset = {
            name: $filter('i18n')('add_insert_preset', $rootScope.loc.ale, 'command_queue'),
            value: null
        };

        commandData.units = angular.copy(preset.units);
        commandData.officers = angular.copy(preset.officers);

        if (preset.catapult_target) {
            commandData.catapultTarget = preset.catapult_target;
            $scope.catapultTarget = {
                name: $filter('i18n')(preset.catapult_target, $rootScope.loc.ale, 'building_names'),
                value: preset.catapult_target
            };
            $scope.showCatapultSelect = true;

        }
    };

    const setupCountdownForCommand = function (command) {
        if(!command.updateCountdown) {
            command.updateCountdown = function () {
                const gameClockTime = $timeHelper.serverTime() + $rootScope.GAME_TIME_OFFSET; // this yields the current time displayed by the game clock
                const displaySendTime = command.sendTime - (new Date()).getTimezoneOffset()*60*1000; // at time of writing, the command.sendTime is buggy - it's off by GMT offset plus GAME_TIME_OFFSET. This corrects that for display.

                command.countdown = displaySendTime - gameClockTime;
            };
        }
        $timeHelper.timer.add(command.updateCountdown);
    };

    const updateWaitingCommands = function () {
        $scope.waitingCommands = commandQueue.getWaitingCommands();
    };

    const updateSentCommands = function () {
        $scope.sentCommands = commandQueue.getSentCommands();
    };

    const updateExpiredCommands = function () {
        $scope.expiredCommands = commandQueue.getExpiredCommands();
    };

    const updateVisibleCommands = function () {
        let commands = $scope.waitingCommands;

        FILTER_ORDER.forEach(function (filter) {
            if ($scope.activeFilters[filter]) {
                commands = commandQueue.filterCommands(filter, $scope.filtersData, commands);
            }
        });

        $scope.visibleWaitingCommands = commands;
    };

    const onUnitInputFocus = function (unit) {
        if (commandData.units[unit] === 0) {
            commandData.units[unit] = '';
        }
    };

    const onUnitInputBlur = function (unit) {
        if (commandData.units[unit] === '') {
            commandData.units[unit] = 0;
        }
    };

    const catapultTargetVisibility = function () {
        $scope.showCatapultSelect = !!commandData.units.catapult;
    };

    const selectTab = function (tabType) {
        $scope.selectedTab = tabType;
    };

    const addSelected = function () {
        const village = modelDataService.getSelectedVillage().data;
        
        commandData.origin = {
            id: village.villageId,
            x: village.x,
            y: village.y,
            name: village.name,
            character_id: $player.getId()
        };
    };

    const addMapSelected = function () {
        if (!mapSelectedVillage) {
            return utils.notif('error', $filter('i18n')('error_no_map_selected_village', $rootScope.loc.ale, 'command_queue'));
        }

        mapData.loadTownDataAsync(mapSelectedVillage.x, mapSelectedVillage.y, 1, 1, function (data) {
            commandData.target = data;
        });
    };

    const addCurrentDate = function () {
        commandData.date = formatedDate();
    };

    const incrementDate = function () {
        if (!commandData.date) {
            return false;
        }

        commandData.date = addDateDiff(commandData.date, 100);
    };

    const reduceDate = function () {
        if (!commandData.date) {
            return false;
        }

        commandData.date = addDateDiff(commandData.date, -100);
    };

    const cleanUnitInputs = function () {
        commandData.units = angular.copy(unitList);
        commandData.officers = angular.copy(officerList);
        commandData.catapultTarget = DEFAULT_CATAPULT_TARGET;
        $scope.catapultTarget = {
            name: $filter('i18n')(DEFAULT_CATAPULT_TARGET, $rootScope.loc.ale, 'building_names'),
            value: DEFAULT_CATAPULT_TARGET
        };
        $scope.showCatapultSelect = false;
    };

    const addCommand = function (commandType) {
        commandQueue.addCommand(
            commandData.origin,
            commandData.target,
            commandData.date,
            commandData.dateType,
            commandData.units,
            commandData.officers,
            commandType,
            commandData.catapultTarget
        ).then(function (command) {
            updateWaitingCommands();
            updateVisibleCommands();
            setupCountdownForCommand(command);

            utils.notif('success', genNotifText(command.type, 'added'));
        }).catch(function (error) {
            switch (error) {
                case ERROR_CODES.INVALID_ORIGIN: {
                    utils.notif('error', $filter('i18n')('error_origin', $rootScope.loc.ale, 'command_queue'));
                    break;
                }
                case ERROR_CODES.INVALID_TARGET: {
                    utils.notif('error', $filter('i18n')('error_target', $rootScope.loc.ale, 'command_queue'));
                    break;
                }
                case ERROR_CODES.INVALID_DATE: {
                    utils.notif('error', $filter('i18n')('error_invalid_date', $rootScope.loc.ale, 'command_queue'));
                    break;
                }
                case ERROR_CODES.NO_UNITS: {
                    utils.notif('error', $filter('i18n')('error_no_units', $rootScope.loc.ale, 'command_queue'));
                    break;
                }
                case ERROR_CODES.RELOCATE_DISABLED: {
                    utils.notif('error', $filter('i18n')('error_relocate_disabled', $rootScope.loc.ale, 'command_queue'));
                    break;
                }
                case ERROR_CODES.ALREADY_SENT: {
                    utils.notif('error', $filter('i18n')('error_already_sent_' + commandType, $rootScope.loc.ale, 'command_queue'));
                    break;
                }
            }
        });
    };

    const clearRegisters = function () {
        commandQueue.clearRegisters();
        updateSentCommands();
        updateExpiredCommands();
    };

    const switchCommandQueue = function () {
        if (commandQueue.isRunning()) {
            commandQueue.stop();
        } else {
            commandQueue.start();
        }
    };

    /**
     * Gera um texto de notificação com as traduções.
     *
     * @param  {String} key
     * @param  {String} key2
     * @param  {String=} prefix
     * @return {String}
     */
    const genNotifText = function (key, key2, prefix) {
        if (prefix) {
            key = prefix + '.' + key;
        }

        const a = $filter('i18n')(key, $rootScope.loc.ale, 'command_queue');
        const b = $filter('i18n')(key2, $rootScope.loc.ale, 'command_queue');

        return a + ' ' + b;
    };

    const toggleFilter = function (filter, allowedTypes) {
        $scope.activeFilters[filter] = !$scope.activeFilters[filter];

        if (allowedTypes) {
            $scope.filtersData[FILTER_TYPES.ALLOWED_TYPES][filter] = !$scope.filtersData[FILTER_TYPES.ALLOWED_TYPES][filter];
        }

        updateVisibleCommands();
    };

    const textMatchFilter = function () {
        $scope.activeFilters[FILTER_TYPES.TEXT_MATCH] = $scope.filtersData[FILTER_TYPES.TEXT_MATCH].length > 0;
        updateVisibleCommands();
    };

    const eventHandlers = {
        updatePresets: function () {
            $scope.presets = utils.obj2selectOptions(presetList.getPresets());
        },
        autoCompleteSelected: function (event, id, data, type) {
            if (id !== 'commandqueue_village_search') {
                return false;
            }

            commandData[type] = {
                id: data.raw.id,
                x: data.raw.x,
                y: data.raw.y,
                name: data.raw.name
            };

            $scope.searchQuery[type] = '';
        },
        removeCommand: function (event, command) {
            if(!$timeHelper.timer.remove(command.updateCountdown)) utils.notif('error', 'Error stopping command countdown. Command still removed.');
            updateWaitingCommands();
            updateVisibleCommands();
            $rootScope.$broadcast(eventTypeProvider.TOOLTIP_HIDE, 'twoverflow-tooltip');
            utils.notif('success', genNotifText(command.type, 'removed'));
        },
        removeError: function () {
            utils.notif('error', $filter('i18n')('error_remove_error', $rootScope.loc.ale, 'command_queue'));
        },
        sendTimeLimit: function (event, command) {
            updateSentCommands();
            updateExpiredCommands();
            updateWaitingCommands();
            updateVisibleCommands();
            utils.notif('error', genNotifText(command.type, 'expired'));
        },
        sendNotOwnVillage: function () {
            updateSentCommands();
            updateExpiredCommands();
            updateWaitingCommands();
            updateVisibleCommands();
            utils.notif('error', $filter('i18n')('error_not_own_village', $rootScope.loc.ale, 'command_queue'));
        },
        sendNoUnitsEnough: function () {
            updateSentCommands();
            updateExpiredCommands();
            updateWaitingCommands();
            updateVisibleCommands();
            utils.notif('error', $filter('i18n')('error_no_units_enough', $rootScope.loc.ale, 'command_queue'));
        },
        sendCommand: function (event, command) {
            if(!$timeHelper.timer.remove(command.updateCountdown)) utils.notif('error', 'Error stopping command countdown. Command still sent.');
            updateSentCommands();
            updateWaitingCommands();
            updateVisibleCommands();
            utils.notif('success', genNotifText(command.type, 'sent'));
        },
        start: function (event, data) {
            $scope.running = commandQueue.isRunning();

            if (data.disableNotif) {
                return false;
            }

            utils.notif('success', genNotifText('title', 'activated'));
        },
        stop: function () {
            $scope.running = commandQueue.isRunning();
            utils.notif('success', genNotifText('title', 'deactivated'));
        },
        onAutoCompleteOrigin: function (data) {
            commandData.origin = {
                id: data.id,
                x: data.x,
                y: data.y,
                name: data.name
            };
        },
        onAutoCompleteTarget: function (data) {
            commandData.target = {
                id: data.id,
                x: data.x,
                y: data.y,
                name: data.name
            };
        },
        clearCountdownUpdates: function () {
            commandQueue.getWaitingCommands().forEach((command) => {
                $timeHelper.timer.remove(command.updateCountdown);
            });
        }
    };

    const init = function () {
        $player = modelDataService.getSelectedCharacter();
        timeOffset = utils.getTimeOffset();
        const attackableBuildingsMap = $gameData.getAttackableBuildings();

        for (const building in attackableBuildingsMap) {
            attackableBuildingsList.push({
                name: $filter('i18n')(building, $rootScope.loc.ale, 'building_names'),
                value: building
            });
        }

        unitOrder = angular.copy(orderedUnitNames);
        unitOrder.splice(unitOrder.indexOf('catapult'), 1);

        orderedUnitNames.forEach(function (unit) {
            unitList[unit] = 0;
        });

        orderedOfficerNames.forEach(function (unit) {
            officerList[unit] = false;
        });

        commandData = {
            origin: false,
            target: false,
            date: '',
            dateType: DATE_TYPES.OUT,
            units: angular.copy(unitList),
            officers: angular.copy(officerList),
            catapultTarget: DEFAULT_CATAPULT_TARGET,
            type: null
        };
        activeFilters = {
            [FILTER_TYPES.SELECTED_VILLAGE]: false,
            [FILTER_TYPES.BARBARIAN_TARGET]: false,
            [FILTER_TYPES.ALLOWED_TYPES]: true,
            [FILTER_TYPES.ATTACK]: true,
            [FILTER_TYPES.SUPPORT]: true,
            [FILTER_TYPES.RELOCATE]: true,
            [FILTER_TYPES.TEXT_MATCH]: false
        };
        filtersData = {
            [FILTER_TYPES.ALLOWED_TYPES]: {
                [FILTER_TYPES.ATTACK]: true,
                [FILTER_TYPES.SUPPORT]: true,
                [FILTER_TYPES.RELOCATE]: true
            },
            [FILTER_TYPES.TEXT_MATCH]: ''
        };

        $button = interfaceOverflow.addMenuButton('Commander', 20);
        $button.addEventListener('click', buildWindow);

        eventQueue.register(eventTypeProvider.COMMAND_QUEUE_START, function () {
            $button.classList.remove('btn-orange');
            $button.classList.add('btn-red');
        });

        eventQueue.register(eventTypeProvider.COMMAND_QUEUE_STOP, function () {
            $button.classList.remove('btn-red');
            $button.classList.add('btn-orange');
        });

        $rootScope.$on(eventTypeProvider.SHOW_CONTEXT_MENU, setMapSelectedVillage);
        $rootScope.$on(eventTypeProvider.DESTROY_CONTEXT_MENU, unsetMapSelectedVillage);

        interfaceOverflow.addTemplate('twoverflow_queue_window', `___command_queue_html_main`);
        interfaceOverflow.addStyle('___command_queue_css_style');
    };

    const buildWindow = function () {
        const lastDateType = Lockr.get(STORAGE_KEYS.LAST_DATE_TYPE, DATE_TYPES.OUT, true);

        $scope = $rootScope.$new();
        $scope.selectedTab = DEFAULT_TAB;
        $scope.inventory = modelDataService.getInventory();
        $scope.presets = utils.obj2selectOptions(presetList.getPresets());
        $scope.travelTimes = {};

        utils.each(COMMAND_TYPES, function (commandType) {
            $scope.travelTimes[commandType] = {};

            utils.each(travelTimeArmy, function (army, unit) {
                $scope.travelTimes[commandType][unit] = {travelTime: 0, status: 'neutral'};
            });
        });

        $scope.unitOrder = unitOrder;
        $scope.officers = $gameData.getOrderedOfficerNames();
        $scope.searchQuery = {
            origin: '',
            target: ''
        };
        $scope.isValidDate = false;
        $scope.dateTypes = util.toActionList(DATE_TYPES, function (actionType) {
            return $filter('i18n')(actionType, $rootScope.loc.ale, 'command_queue');
        });
        $scope.selectedDateType = {
            name: $filter('i18n')(lastDateType, $rootScope.loc.ale, 'command_queue'),
            value: lastDateType
        };
        $scope.selectedInsertPreset = {
            name: $filter('i18n')('add_insert_preset', $rootScope.loc.ale, 'command_queue'),
            value: null
        };
        $scope.catapultTarget = {
            name: $filter('i18n')(DEFAULT_CATAPULT_TARGET, $rootScope.loc.ale, 'building_names'),
            value: DEFAULT_CATAPULT_TARGET
        };
        $scope.autoCompleteOrigin = {
            type: ['village'],
            placeholder: $filter('i18n')('add_village_search', $rootScope.loc.ale, 'command_queue'),
            onEnter: eventHandlers.onAutoCompleteOrigin,
            tooltip: $filter('i18n')('add_origin', $rootScope.loc.ale, 'command_queue'),
            dropDown: true
        };
        $scope.autoCompleteTarget = {
            type: ['village'],
            placeholder: $filter('i18n')('add_village_search', $rootScope.loc.ale, 'command_queue'),
            onEnter: eventHandlers.onAutoCompleteTarget,
            tooltip: $filter('i18n')('add_target', $rootScope.loc.ale, 'command_queue'),
            dropDown: true
        };
        $scope.showCatapultSelect = !!commandData.units.catapult;
        $scope.attackableBuildings = attackableBuildingsList;
        $scope.commandData = commandData;
        $scope.activeFilters = activeFilters;
        $scope.filtersData = filtersData;
        $scope.running = commandQueue.isRunning();
        $scope.waitingCommands = commandQueue.getWaitingCommands();
        $scope.visibleWaitingCommands = commandQueue.getWaitingCommands();
        $scope.sentCommands = commandQueue.getSentCommands();
        $scope.expiredCommands = commandQueue.getExpiredCommands();
        $scope.EVENT_CODES = EVENT_CODES;
        $scope.FILTER_TYPES = FILTER_TYPES;
        $scope.TAB_TYPES = TAB_TYPES;
        $scope.COMMAND_TYPES = COMMAND_TYPES;
        $scope.relocateEnabled = modelDataService.getWorldConfig().isRelocateUnitsEnabled();

        // functions
        $scope.onUnitInputFocus = onUnitInputFocus;
        $scope.onUnitInputBlur = onUnitInputBlur;
        $scope.catapultTargetVisibility = catapultTargetVisibility;
        $scope.selectTab = selectTab;
        $scope.addSelected = addSelected;
        $scope.addMapSelected = addMapSelected;
        $scope.addCurrentDate = addCurrentDate;
        $scope.incrementDate = incrementDate;
        $scope.reduceDate = reduceDate;
        $scope.cleanUnitInputs = cleanUnitInputs;
        $scope.addCommand = addCommand;
        $scope.clearRegisters = clearRegisters;
        $scope.switchCommandQueue = switchCommandQueue;
        $scope.removeCommand = commandQueue.removeCommand;
        $scope.openVillageInfo = windowDisplayService.openVillageInfo;
        $scope.toggleFilter = toggleFilter;

        $scope.$watch('commandData.origin', updateTravelTimes);
        $scope.$watch('commandData.target', updateTravelTimes);
        $scope.$watch('commandData.date', updateTravelTimes);
        $scope.$watch('commandData.officers', updateTravelTimes);
        $scope.$watch('selectedDateType.value', updateDateType);
        $scope.$watch('selectedInsertPreset.value', insertPreset);
        $scope.$watch('catapultTarget.value', updateCatapultTarget);
        $scope.$watch('filtersData[FILTER_TYPES.TEXT_MATCH]', textMatchFilter);

        let travelTimesTimer;

        $scope.$watch('selectedTab', function () {
            if ($scope.selectedTab === TAB_TYPES.ADD) {
                travelTimesTimer = setInterval(function () {
                    updateTravelTimes();
                }, 2500);
            } else {
                clearInterval(travelTimesTimer);
            }
        });
        
        $scope.waitingCommands.forEach((command) => {
            setupCountdownForCommand(command);
        });

        const eventScope = new EventScope('twoverflow_queue_window', function () {
            clearInterval(travelTimesTimer);
            eventHandlers.clearCountdownUpdates();
        });

        eventScope.register(eventTypeProvider.ARMY_PRESET_UPDATE, eventHandlers.updatePresets, true);
        eventScope.register(eventTypeProvider.ARMY_PRESET_DELETED, eventHandlers.updatePresets, true);
        eventScope.register(eventTypeProvider.SELECT_SELECTED, eventHandlers.autoCompleteSelected, true);
        eventScope.register(eventTypeProvider.COMMAND_QUEUE_REMOVE, eventHandlers.removeCommand);
        eventScope.register(eventTypeProvider.COMMAND_QUEUE_REMOVE_ERROR, eventHandlers.removeError);
        eventScope.register(eventTypeProvider.COMMAND_QUEUE_SEND_TIME_LIMIT, eventHandlers.sendTimeLimit);
        eventScope.register(eventTypeProvider.COMMAND_QUEUE_SEND_NOT_OWN_VILLAGE, eventHandlers.sendNotOwnVillage);
        eventScope.register(eventTypeProvider.COMMAND_QUEUE_SEND_NO_UNITS_ENOUGH, eventHandlers.sendNoUnitsEnough);
        eventScope.register(eventTypeProvider.COMMAND_QUEUE_SEND, eventHandlers.sendCommand);
        eventScope.register(eventTypeProvider.COMMAND_QUEUE_START, eventHandlers.start);
        eventScope.register(eventTypeProvider.COMMAND_QUEUE_STOP, eventHandlers.stop);

        windowManagerService.getScreenWithInjectedScope('!twoverflow_queue_window', $scope);
    };

    return init;
});
