define('two/farmOverflow', [
    'two/Settings',
    'two/farmOverflow/types/errors',
    'two/farmOverflow/types/status',
    'two/farmOverflow/settings',
    'two/farmOverflow/settings/map',
    'two/farmOverflow/settings/updates',
    'two/farmOverflow/types/farmerBehavior',
    'two/farmOverflow/types/targetBehavior',
    'two/farmOverflow/types/logs',
    'two/mapData',
    'two/utils',
    'two/ready',
    'helper/math',
    'helper/time',
    'queues/EventQueue',
    'conf/commandTypes',
    'conf/village',
    'conf/resourceTypes',
    'struct/MapData',
    'Lockr',
    'two/debug'
], function (
    Settings,
    ERROR_TYPES,
    STATUS,
    SETTINGS,
    SETTINGS_MAP,
    UPDATES,
    FARMER_BEHAVIOR,
    TARGET_BEHAVIOR,
    LOG_TYPES,
    twoMapData,
    utils,
    ready,
    math,
    timeHelper,
    eventQueue,
    COMMAND_TYPES,
    VILLAGE_CONFIG,
    RESOURCE_TYPES,
    $mapData,
    Lockr,
    setupDebug
) {
    let initialized = false;
    let running = false;
    let settings;
    let localSettings;
    const farmers = [];
    let logs = [];
    let includedVillages = [];
    let ignoredVillages = [];
    let onlyVillages = [];
    let selectedPresets = [];
    let activeFarmer = false;
    let sendingCommand = false;
    let currentTarget = false;
    let farmerIndex = 0;
    let cycleTimer = null;
    let stepDelayTimer = null;
    let commandExpireTimer = null;
    let exceptionLogs;
    const tempVillageReports = {};
    let $player;
    let unitsData;
    let persistentRunningLastCheck = timeHelper.gameTime();
    let persistentRunningTimer = null;
    let nextCycleDate = null;
    const PERSISTENT_RUNNING_CHECK_INTERVAL = 30 * 1000;
    const VILLAGE_COMMAND_LIMIT = 50;
    const MINIMUM_FARMER_CYCLE_INTERVAL = 100; // ms
    const MINIMUM_ATTACK_INTERVAL = 100; // ms
    const STEP_EXPIRE_TIME = 30 * 1000;
    const CYCLE_BEGIN = 'cycle_begin';
    const IGNORE_UPDATES = 'ignore_update';
    const STORAGE_KEYS = {
        LOGS: 'farm_overflow_logs',
        SETTINGS: 'farm_overflow_settings',
        EXCEPTION_LOGS: 'farm_overflow_exception_logs'
    };
    const RESOURCES = [
        RESOURCE_TYPES.WOOD,
        RESOURCE_TYPES.CLAY,
        RESOURCE_TYPES.IRON
    ];

    const debug = setupDebug('farm_overflow');

    const villageFilters = {
        distance: function (target) {
            return !target.distance.between(
                localSettings[SETTINGS.MIN_DISTANCE],
                localSettings[SETTINGS.MAX_DISTANCE]
            );
        },
        ownPlayer: function (target) {
            return target.character_id === $player.getId();
        },
        included: function (target) {
            return target.character_id && !includedVillages.includes(target.id);
        },
        ignored: function (target) {
            return ignoredVillages.includes(target.id);
        },
        points: function (points) {
            return !points.between(
                localSettings[SETTINGS.MIN_POINTS],
                localSettings[SETTINGS.MAX_POINTS]
            );
        }
    };

    const targetFilters = [
        villageFilters.distance,
        villageFilters.ownPlayer,
        villageFilters.included,
        villageFilters.ignored
    ];

    const calcDistances = function (targets, origin) {
        return targets.map(function (target) {
            target.distance = math.actualDistance(origin, target);
            return target;
        });
    };

    const filterTargets = function (targets) {
        return targets.filter(function (target) {
            return targetFilters.every(function (fn) {
                return !fn(target);
            });
        });
    };

    const sortTargets = function (targets) {
        return targets.sort(function (a, b) {
            return a.distance - b.distance;
        });
    };

    const arrayUnique = function (array) {
        return array.sort().filter(function (item, pos, ary) {
            return !pos || item != ary[pos - 1];
        });
    };

    const reloadTimers = function () {
        if (!running) {
            return;
        }

        if (stepDelayTimer) {
            stopTimers();
            activeFarmer.targetStep({
                delay: true
            });
        } else if (cycleTimer) {
            stopTimers();

            eventQueue.trigger(eventTypeProvider.FARM_OVERFLOW_CYCLE_BEGIN);

            farmerIndex = 0;
            farmerStep();
        }
    };

    const updateIncludedVillage = function () {
        const groupsInclude = localSettings[SETTINGS.GROUP_INCLUDE];

        includedVillages = [];

        groupsInclude.forEach(function (groupId) {
            const groupVillages = modelDataService.getGroupList().getGroupVillageIds(groupId);
            includedVillages = includedVillages.concat(groupVillages);
        });

        includedVillages = arrayUnique(includedVillages);
    };

    const updateIgnoredVillage = function () {
        const groupIgnored = localSettings[SETTINGS.GROUP_IGNORE];
        ignoredVillages = modelDataService.getGroupList().getGroupVillageIds(groupIgnored);
    };

    const updateOnlyVillage = function () {
        const groupsOnly = localSettings[SETTINGS.GROUP_ONLY];

        onlyVillages = [];

        groupsOnly.forEach(function (groupId) {
            let groupVillages = modelDataService.getGroupList().getGroupVillageIds(groupId);
            groupVillages = groupVillages.filter(function (villageId) {
                return !!$player.getVillage(villageId);
            });

            onlyVillages = onlyVillages.concat(groupVillages);
        });

        onlyVillages = arrayUnique(onlyVillages);
    };

    const updateExceptionLogs = function () {
        const exceptionVillages = ignoredVillages.concat(includedVillages);
        let modified = false;

        exceptionVillages.forEach(function (villageId) {
            if (!hasOwn.call(exceptionLogs, villageId)) { 
                exceptionLogs[villageId] = {
                    time: timeHelper.gameTime(),
                    report: false
                };
                modified = true;
            }
        });

        utils.each(exceptionLogs, function (time, villageId) {
            villageId = parseInt(villageId, 10);
            
            if (!exceptionVillages.includes(villageId)) {
                delete exceptionLogs[villageId];
                modified = true;
            }
        });

        if (modified) {
            Lockr.set(STORAGE_KEYS.EXCEPTION_LOGS, exceptionLogs);
            eventQueue.trigger(eventTypeProvider.FARM_OVERFLOW_EXCEPTION_LOGS_UPDATED);
        }
    };

    const updateGroupVillages = function () {
        updateIncludedVillage();
        updateIgnoredVillage();
        updateOnlyVillage();
        updateExceptionLogs();

        debug(1, 'includedVillages %o', includedVillages);
        debug(1, 'ignoredVillages %o', ignoredVillages);
        debug(1, 'onlyVillages %o', onlyVillages);

        eventQueue.trigger(eventTypeProvider.FARM_OVERFLOW_EXCEPTION_VILLAGES_UPDATED);
    };

    const villageGroupLink = function (event, data) {
        debug(1, 'group village linked: %d', data.group_id);

        const groupsInclude = localSettings[SETTINGS.GROUP_INCLUDE];
        const groupIgnore = localSettings[SETTINGS.GROUP_IGNORE];
        const groupsOnly = localSettings[SETTINGS.GROUP_ONLY];
        const isOwnVillage = $player.getVillage(data.village_id);
        let farmerListUpdated = false;

        updateGroupVillages();

        if (groupIgnore === data.group_id) {
            if (isOwnVillage) {
                removeFarmer(data.village_id);
                farmerListUpdated = true;
            } else {
                removeTarget(data.village_id);

                addLog(LOG_TYPES.IGNORED_VILLAGE, {
                    villageId: data.village_id
                });
                addExceptionLog(data.village_id);
            }
        }

        if (groupsInclude.includes(data.group_id) && !isOwnVillage) {
            reloadTargets();

            addLog(LOG_TYPES.INCLUDED_VILLAGE, {
                villageId: data.village_id
            });
            addExceptionLog(data.village_id);
        }

        if (groupsOnly.includes(data.group_id) && isOwnVillage) {
            const farmer = createFarmer(data.village_id);
            farmer.init().then(function () {
                if (running) {
                    farmer.start();
                }
            });

            farmerListUpdated = true;
        }

        if (farmerListUpdated) {
            eventQueue.trigger(eventTypeProvider.FARM_OVERFLOW_FARMER_VILLAGES_UPDATED);
        }
    };

    const villageGroupUnlink = function (event, data) {
        debug(1, 'group village unlinked: %d', data.group_id);

        const groupsInclude = localSettings[SETTINGS.GROUP_INCLUDE];
        const groupIgnore = localSettings[SETTINGS.GROUP_IGNORE];
        const groupsOnly = localSettings[SETTINGS.GROUP_ONLY];
        const isOwnVillage = $player.getVillage(data.village_id);
        let farmerListUpdated = false;

        updateGroupVillages();

        if (groupIgnore === data.group_id) {
            if (isOwnVillage) {
                const farmer = createFarmer(data.village_id);
                farmer.init().then(function () {
                    if (running) {
                        farmer.start();
                    }
                });

                farmerListUpdated = true;
            } else {
                reloadTargets();

                addLog(LOG_TYPES.IGNORED_VILLAGE_REMOVED, {
                    villageId: data.village_id
                });
            }
        }

        if (groupsInclude.includes(data.group_id) && !isOwnVillage) {
            reloadTargets();

            addLog(LOG_TYPES.INCLUDED_VILLAGE_REMOVED, {
                villageId: data.village_id
            });
        }

        if (groupsOnly.includes(data.group_id) && isOwnVillage) {
            removeFarmer(data.village_id);
            farmerListUpdated = true;
        }

        if (farmerListUpdated) {
            eventQueue.trigger(eventTypeProvider.FARM_OVERFLOW_FARMER_VILLAGES_UPDATED);
        }
    };

    const validGroups = function (_flag) {
        const gameGroups = modelDataService.getGroupList().getGroups();
        const groupIgnore = localSettings[SETTINGS.GROUP_IGNORE];

        const groupsOnly = localSettings[SETTINGS.GROUP_ONLY];
        const groupsInclude = localSettings[SETTINGS.GROUP_INCLUDE];
        const validedGroupIgnore = hasOwn.call(gameGroups, groupIgnore) ? groupIgnore : settings.getDefault(SETTINGS.GROUP_IGNORE);
        const validedGroupsOnly = groupsOnly.filter(groupId => hasOwn.call(gameGroups, groupId));
        const validedGroupsInclude = groupsInclude.filter(groupId => hasOwn.call(gameGroups, groupId));

        settings.setAll({
            [SETTINGS.GROUP_IGNORE]: validedGroupIgnore,
            [SETTINGS.GROUP_ONLY]: validedGroupsOnly,
            [SETTINGS.GROUP_INCLUDE]: validedGroupsInclude
        }, _flag);
    };

    const removedGroupListener = function () {
        validGroups();
        updateGroupVillages();

        flushFarmers();
        reloadTargets();
        createFarmers();
    };

    const processPresets = function () {
        selectedPresets = [];
        const playerPresets = modelDataService.getPresetList().getPresets();
        const activePresets = localSettings[SETTINGS.PRESETS];

        activePresets.forEach(function (presetId) {
            if (!hasOwn.call(playerPresets, presetId)) {
                return;
            }

            const preset = playerPresets[presetId];
            preset.load = getPresetHaul(preset);
            preset.travelTime = armyService.calculateTravelTime(preset, {
                barbarian: false,
                officers: false
            });

            selectedPresets.push(preset);
        });

        selectedPresets = selectedPresets.sort(function (a, b) {
            return a.travelTime - b.travelTime || b.load - a.load;
        });

        debug(1, 'selected presets %o', selectedPresets.map(preset => preset.id));
        debug(2, 'selected presets detailed %o', selectedPresets);
    };

    const ignoreVillage = function (villageId) {
        const groupIgnore = localSettings[SETTINGS.GROUP_IGNORE];

        if (!groupIgnore) {
            return false;
        }

        socketService.emit(routeProvider.GROUPS_LINK_VILLAGE, {
            group_id: groupIgnore,
            village_id: villageId
        });

        return true;
    };

    const presetListener = function () {
        processPresets();

        if (!selectedPresets.length) {
            eventQueue.trigger(eventTypeProvider.FARM_OVERFLOW_STOP, {
                reason: ERROR_TYPES.NO_PRESETS
            });

            if (running) {
                farmOverflow.stop();
            }
        }
    };

    const reportListener = function (event, data) {
        if (!localSettings[SETTINGS.IGNORE_ON_LOSS] || !localSettings[SETTINGS.GROUP_IGNORE]) {
            return;
        }

        if (!running || data.type !== COMMAND_TYPES.TYPES.ATTACK) {
            return;
        }

        // 1 = nocasualties
        // 2 = casualties
        // 3 = defeat
        if (data.result !== 1 && isTarget(data.target_village_id)) {
            tempVillageReports[data.target_village_id] = {
                haul: data.haul,
                id: data.id,
                result: data.result,
                title: data.title
            };

            ignoreVillage(data.target_village_id);
        }
    };

    const commandSentListener = function (event, data) {
        if (!activeFarmer || !currentTarget) {
            return;
        }

        if (data.origin.id !== activeFarmer.getId()) {
            return;
        }

        if (data.target.id !== currentTarget.id) {
            return;
        }

        if (data.direction === 'forward' && data.type === COMMAND_TYPES.TYPES.ATTACK) {
            activeFarmer.commandSent(data);
        }
    };

    const commandErrorListener = function (event, data) {
        if (!activeFarmer || !sendingCommand || !currentTarget) {
            return;
        }

        if (data.cause === routeProvider.SEND_PRESET.type) {
            activeFarmer.commandError(data);
        }
    };

    const getPresetHaul = function (preset) {
        let haul = 0;

        utils.each(preset.units, function (unitAmount, unitName) {
            if (unitAmount) {
                haul += unitsData[unitName].load * unitAmount;
            }
        });

        return haul;
    };

    const addExceptionLog = function (villageId) {
        exceptionLogs[villageId] = {
            time: timeHelper.gameTime(),
            report: tempVillageReports[villageId] || false
        };

        delete tempVillageReports[villageId];

        Lockr.set(STORAGE_KEYS.EXCEPTION_LOGS, exceptionLogs);
        eventQueue.trigger(eventTypeProvider.FARM_OVERFLOW_EXCEPTION_LOGS_UPDATED);
    };

    const addLog = function (type, data = {}) {
        if (typeof type !== 'string') {
            return false;
        }

        if (!angular.isObject(data)) {
            data = {};
        }

        data.time = timeHelper.gameTime();
        data.type = type;

        logs.unshift(data);
        trimAndSaveLogs();

        return true;
    };

    const trimAndSaveLogs = function () {
        const limit = localSettings[SETTINGS.LOGS_LIMIT];

        if (logs.length > limit) {
            logs.splice(logs.length - limit, logs.length);
        }

        Lockr.set(STORAGE_KEYS.LOGS, logs);
        eventQueue.trigger(eventTypeProvider.FARM_OVERFLOW_LOGS_UPDATED);
    };

    const targetIsFree = function (thisFarmerIsAttacking, otherFarmerIsAttacking) {
        const farmerBehavior = localSettings[SETTINGS.FARMER_BEHAVIOR];
        const targetBehavior = localSettings[SETTINGS.TARGET_BEHAVIOR];

        if (thisFarmerIsAttacking) {
            if (farmerBehavior === FARMER_BEHAVIOR.ALLOW_MULTIPLE_ATTACK_EACH_TARGET) {
                return true;
            } else {
                return false;
            }
        } else if (otherFarmerIsAttacking) {
            if (targetBehavior === TARGET_BEHAVIOR.TARGETS_ALLOW_MULTIPLE_FARMERS) {
                return true;
            } else {
                return false;
            }
        } else {
            return true;
        }
    };

    const enableRequiredPresets = function (villageId, callback) {
        const villagePresets = modelDataService.getPresetList().getPresetsByVillageId(villageId);
        const missingPresets = [];

        selectedPresets.forEach(function (preset) {
            if (!hasOwn.call(villagePresets, preset.id)) {
                missingPresets.push(preset.id);
            }
        });

        if (missingPresets.length) {
            // include already enabled presets because you can't only enable
            // missing ones, you need to emit all you want enabled.
            for (const id in villagePresets) {
                if (hasOwn.call(villagePresets, id)) {
                    missingPresets.push(id);
                }
            }

            socketService.emit(routeProvider.ASSIGN_PRESETS, {
                village_id: villageId,
                preset_ids: missingPresets
            }, callback);

            return;
        }

        callback();
    };

    const persistentRunningStart = function () {
        const cycleInterval = getCycleInterval();
        const attackInterval = getAttackInterval();
        const timeLimit = cycleInterval + (cycleInterval / 2) + attackInterval;

        persistentRunningTimer = setInterval(function () {
            const now = timeHelper.gameTime();

            if (now - persistentRunningLastCheck > timeLimit) {
                farmOverflow.stop();
                setTimeout(farmOverflow.start, 5000);
            }
        }, PERSISTENT_RUNNING_CHECK_INTERVAL);
    };

    const persistentRunningStop = function () {
        clearInterval(persistentRunningTimer);
    };

    const persistentRunningUpdate = function () {
        persistentRunningLastCheck = timeHelper.gameTime();
    };

    const stopTimers = function () {
        clearTimeout(cycleTimer);
        clearTimeout(stepDelayTimer);
        clearTimeout(commandExpireTimer);

        cycleTimer = null;
        stepDelayTimer = null;
        commandExpireTimer = null;
    };

    const getCycleInterval = function () {
        return Math.max(MINIMUM_FARMER_CYCLE_INTERVAL, localSettings[SETTINGS.FARMER_CYCLE_INTERVAL]);
    };

    const getAttackInterval = function () {
        const min = localSettings[SETTINGS.ATTACK_INTERVAL];
        const max = min * 1.5;

        return Math.random() * (max - min) + min;
    };

    function incomingCommandsFilter (command) {
        return command.startCharacterId === $player.getId() && command.data.direction === 'forward';
    }

    const Farmer = function (villageId) {
        this.villageId = villageId;
        this.village = $player.getVillage(villageId);

        if (!this.village) {
            throw new Error(`new Farmer -> Village ${villageId} doesn't exist.`);
        }

        this.index = 0;
        this.running = false;
        this.initialized = false;
        this.targets = false;
        this.onCycleEndFn = noop;
        this.status = STATUS.WAITING_CYCLE;
    };

    Farmer.prototype.init = function () {
        const loadPromises = [];

        if (!this.isInitialized()) {
            loadPromises.push(new Promise((resolve) => {
                if (this.isInitialized()) {
                    return resolve();
                }

                villageService.ensureVillageDataLoaded(this.villageId, resolve);
            }));

            loadPromises.push(new Promise((resolve) => {
                if (this.isInitialized()) {
                    return resolve();
                }

                this.loadTargets(() => {
                    eventQueue.trigger(eventTypeProvider.FARM_OVERFLOW_INSTANCE_READY, {
                        villageId: this.villageId
                    });
                    resolve();
                });
            }));
        }

        return Promise.all(loadPromises).then(() => {
            this.initialized = true;
        });
    };

    Farmer.prototype.start = function () {
        persistentRunningUpdate();

        if (this.running) {
            return false;
        }

        if (!this.initialized) {
            eventQueue.trigger(eventTypeProvider.FARM_OVERFLOW_INSTANCE_ERROR_NOT_READY, {
                villageId: this.villageId
            });
            return false;
        }

        if (!this.targets.length) {
            eventQueue.trigger(eventTypeProvider.FARM_OVERFLOW_INSTANCE_ERROR_NO_TARGETS, {
                villageId: this.villageId
            });
            return false;
        }

        activeFarmer = this;
        this.running = true;
        eventQueue.trigger(eventTypeProvider.FARM_OVERFLOW_INSTANCE_START, {
            villageId: this.villageId
        });

        this.targetStep({
            delay: false
        });

        return true;
    };

    Farmer.prototype.stop = function (reason) {
        this.running = false;

        debug(1, 'stop farmer village %d', this.villageId);

        eventQueue.trigger(eventTypeProvider.FARM_OVERFLOW_INSTANCE_STOP, {
            villageId: this.villageId,
            reason: reason
        });

        if (reason === ERROR_TYPES.USER_STOP) {
            this.setStatus(STATUS.USER_STOP);
        }

        stopTimers();

        this.onCycleEndFn(reason);
        this.onCycleEndFn = noop;
    };

    function stepFactory (id, handler) {
        return function () {
            const promise = new Promise(function (resolve, reject) {
                handler(resolve, reject);
            });

            const stepStart = Date.now();

            promise.catch(noop).finally(function () {
                const stepEnd = Date.now();
                const elapsedTime = stepEnd - stepStart;
                debug(3, '%s took %d', id, elapsedTime);
            });

            return promise;
        };
    }

    Farmer.prototype.targetStep = async function (options = {}) {
        if (!this.running) {
            return false;
        }

        debug(1, 'start target step %d', this.villageId);

        persistentRunningUpdate();

        const commandList = this.village.getCommandListModel();
        const villageCommands = commandList.getOutgoingCommands(true, true);
        let selectedPreset = false;
        let target;
        let checkedLocalCommands = false;
        let otherFarmerIsAttacking;
        let thisFarmerIsAttacking;

        const delayStep = stepFactory('delayStep', (resolve, reject) => {
            if (options.delay) {
                stepDelayTimer = setTimeout(() => {
                    stepDelayTimer = null;

                    if (!this.running) {
                        return reject(STATUS.USER_STOP);
                    }

                    resolve();
                }, getAttackInterval());
            } else {
                resolve();
            }
        });

        const checkCommandLimit = stepFactory('checkCommandLimit', (resolve, reject) => {
            const limit = VILLAGE_COMMAND_LIMIT - localSettings[SETTINGS.PRESERVE_COMMAND_SLOTS];

            if (villageCommands.length >= limit) {
                reject(STATUS.COMMAND_LIMIT);
            } else {
                resolve();
            }
        });

        const checkStorage = stepFactory('checkStorage', (resolve, reject) => {
            if (localSettings[SETTINGS.IGNORE_FULL_STORAGE]) {
                resourceService.updateMaxStorage(this.village);
                const resources = this.village.getResources();
                const computed = resources.getComputed();
                const maxStorage = resources.getMaxStorage();
                const isFull = RESOURCES.every((type) => computed[type].currentStock === maxStorage);

                if (isFull) {
                    return reject(STATUS.FULL_STORAGE);
                }
            }

            resolve();
        });

        const selectTarget = stepFactory('selectTarget', (resolve, reject) => {
            if (!this.targets.length) {
                return reject(STATUS.NO_TARGETS);
            }

            if (this.index > this.targets.length || !this.targets[this.index]) {
                return reject(STATUS.TARGET_CYCLE_END);
            }

            target = this.targets[this.index];

            resolve();
        });

        const checkTarget = stepFactory('checkTarget', (resolve, reject) => {
            const checkTargetHandler = (data) => {
                if (!this.running) {
                    reject(STATUS.USER_STOP);
                } else if (villageFilters.points(data.points)) {
                    return reject(STATUS.NOT_ALLOWED_POINTS);
                } else if (target.character_id !== null && !includedVillages.includes(target.id)) {
                    reject(STATUS.ABANDONED_CONQUERED);
                } else if (target.attack_protection) {
                    reject(STATUS.PROTECTED_VILLAGE);
                } else {
                    resolve();
                }
            };

            const data = $mapData.getTownAt(target.x, target.y);

            if (data) {
                checkTargetHandler($mapData.getTownAt(target.x, target.y));
            } else {
                $mapData.getTownAtAsync(target.x, target.y, checkTargetHandler);
            }
        });

        const checkPresets = stepFactory('checkPresets', (resolve, reject) => {
            enableRequiredPresets(this.villageId, () => {
                if (this.running) {
                    resolve();
                } else {
                    reject(STATUS.USER_STOP);
                }
            });
        });

        const selectPreset = stepFactory('selectPreset', (resolve, reject) => {
            const villageUnits = this.village.getUnitInfo().getUnits();
            const maxTravelTime = localSettings[SETTINGS.MAX_TRAVEL_TIME];
            const villagePosition = this.village.getPosition();
            const targetDistance = math.actualDistance(villagePosition, target);

            utils.each(selectedPresets, (preset) => {
                const enoughUnits = !Object.entries(preset.units).some((unit) => {
                    const name = unit[0];
                    const amount = unit[1];
                            
                    return villageUnits[name].in_town < amount;
                });

                if (!enoughUnits) {
                    return;
                }

                const travelTime = armyService.calculateTravelTime(preset, {
                    barbarian: !target.character_id,
                    officers: false
                });

                if (maxTravelTime > travelTime * targetDistance) {
                    selectedPreset = preset;
                    resolve();
                } else {
                    // why reject with TIME_LIMIT if there are more presets to check?
                    // because the preset list is sorted by travel time.
                    reject(STATUS.TIME_LIMIT);
                }

                return false;
            });

            if (!selectedPreset) {
                reject(STATUS.NO_UNITS);
            }
        });

        const checkLocalCommands = stepFactory('checkLocalCommands', (resolve, reject) => {
            const characterVillages = Object.values(modelDataService.getVillages());
            const allOwnCommandsReady = characterVillages.every(village => village.readyState[VILLAGE_CONFIG.READY_STATES.OWN_COMMANDS]);

            if (allOwnCommandsReady) {
                checkedLocalCommands = true;

                const x = villageInfoService.getCommands(target.id);
                const incomingCommands = x.filter(incomingCommandsFilter);

                otherFarmerIsAttacking = incomingCommands.some((command) => command.startVillageId !== this.villageId);
                thisFarmerIsAttacking = incomingCommands.some((command) => command.startVillageId === this.villageId);

                if (!targetIsFree(thisFarmerIsAttacking, otherFarmerIsAttacking)) {
                    return reject(STATUS.BUSY_TARGET);
                }
            }

            resolve();
        });

        const checkLoadedCommands = stepFactory('checkLoadedCommands', (resolve, reject) => {
            if (checkedLocalCommands) {
                return resolve();
            }

            socketService.emit(routeProvider.MAP_GET_VILLAGE_DETAILS, {
                my_village_id: this.villageId,
                village_id: target.id,
                num_reports: 0
            }, (data) => {
                if (!this.running) {
                    return reject(STATUS.USER_STOP);
                }

                const incomingAttacks = data.commands.own.filter((command) => command.type === COMMAND_TYPES.TYPES.ATTACK && command.direction === 'forward');
                otherFarmerIsAttacking = incomingAttacks.some((command) => command.start_village_id !== this.villageId);
                thisFarmerIsAttacking = incomingAttacks.some((command) => command.start_village_id === this.villageId);

                if (!targetIsFree(thisFarmerIsAttacking, otherFarmerIsAttacking)) {
                    debug(2, 'rejected by checkLoadedCommands');
                    return reject(STATUS.BUSY_TARGET);
                }

                resolve();
            });
        });

        const minimumInterval = stepFactory('minimumInterval', (resolve, reject) => {
            if (!thisFarmerIsAttacking && !otherFarmerIsAttacking) {
                return resolve();
            }

            // command timestamps and time travel calculations are returned as SECONDS
            const multipleAttacksInterval = localSettings[SETTINGS.MULTIPLE_ATTACKS_INTERVAL] / 1000;

            if (!multipleAttacksInterval) {
                return resolve();
            }

            const now = timeHelper.gameTime() / 1000;
            const position = this.village.getPosition();
            const distance = math.actualDistance(position, target);
            const singleFieldtravelTime = armyService.calculateTravelTime(selectedPreset, {
                barbarian: !target.character_id,
                officers: true,
                effects: true
            });
            const commandTravelTime = armyService.getTravelTimeForDistance(selectedPreset, singleFieldtravelTime, distance, COMMAND_TYPES.TYPES.ATTACK);
            const incomingCommands = villageInfoService.getCommands(target.id).filter(incomingCommandsFilter);
            const attackCollision = incomingCommands.some((command) => {
                return Math.abs((now + commandTravelTime) - command.time_completed) < multipleAttacksInterval;
            });

            if (attackCollision) {
                debug(2, 'rejected by minimumInterval');
                return reject(STATUS.BUSY_TARGET);
            }

            resolve();
        });

        const prepareAttack = () => {
            if (!this.running) {
                return false;
            }

            this.setStatus(STATUS.ATTACKING);

            sendingCommand = true;
            currentTarget = target;
            this.index++;

            debug(2, 'sending attack to %d from %d', target.id, this.villageId);

            socketService.emit(routeProvider.SEND_PRESET, {
                start_village: this.villageId,
                target_village: target.id,
                army_preset_id: selectedPreset.id,
                type: COMMAND_TYPES.TYPES.ATTACK
            });
        };

        const stepStatus = (status) => {
            stopTimers();

            debug(1, 'target step finished "%s"', status);

            eventQueue.trigger(eventTypeProvider.FARM_OVERFLOW_INSTANCE_STEP_STATUS, {
                villageId: this.villageId,
                error: status
            });

            switch (status) {
                case STATUS.TIME_LIMIT:
                case STATUS.BUSY_TARGET:
                case STATUS.ABANDONED_CONQUERED:
                case STATUS.PROTECTED_VILLAGE: {
                    this.index++;
                    this.setStatus(status);
                    this.targetStep(options);
                    break;
                }
                case STATUS.USER_STOP: {
                    this.setStatus(status);
                    break;
                }
                case STATUS.NOT_ALLOWED_POINTS: {
                    this.index++;
                    this.setStatus(status);
                    removeTarget(target.id);
                    this.targetStep(options);
                    break;
                }
                case STATUS.NO_UNITS:
                case STATUS.NO_TARGETS:
                case STATUS.FULL_STORAGE:
                case STATUS.COMMAND_LIMIT: {
                    this.index++;
                    this.setStatus(status);
                    this.stop(status);
                    break;
                }
                case STATUS.TARGET_CYCLE_END: {
                    this.index = 0;
                    this.setStatus(status);
                    this.stop(status);
                    break;
                }
                case STATUS.EXPIRED_STEP: {
                    this.setStatus(status);
                    this.targetStep();
                    break;
                }
                default: {
                    this.index++;
                    this.setStatus(STATUS.UNKNOWN);
                    this.stop(STATUS.UNKNOWN);
                    break;
                }
            }
        };

        const attackPromise = new Promise((resolve, reject) => {
            delayStep()
                .then(checkCommandLimit)
                .then(checkStorage)
                .then(selectTarget)
                .then(checkTarget)
                .then(checkPresets)
                .then(selectPreset)
                .then(checkLocalCommands)
                .then(checkLoadedCommands)
                .then(minimumInterval)
                .then(resolve)
                .catch(reject);
        });

        const expirePromise = new Promise((resolve, reject) => {    
            commandExpireTimer = setTimeout(() => {
                if (this.running) {
                    reject(STATUS.EXPIRED_STEP);
                }
            }, STEP_EXPIRE_TIME);
        });

        Promise.race([
            attackPromise,
            expirePromise
        ])
            .then(prepareAttack)
            .catch(stepStatus);
    };

    Farmer.prototype.setStatus = function (newStatus) {
        this.status = newStatus;
    };

    Farmer.prototype.getStatus = function () {
        return this.status || STATUS.UNKNOWN;
    };

    Farmer.prototype.commandSent = function (data) {
        sendingCommand = false;
        currentTarget = false;

        stopTimers();

        addLog(LOG_TYPES.ATTACKED_VILLAGE, {
            targetId: data.target.id
        });

        this.targetStep({
            delay: true
        });
    };

    Farmer.prototype.commandError = function () {
        sendingCommand = false;
        currentTarget = false;

        this.stop(STATUS.COMMAND_ERROR);
    };

    Farmer.prototype.onCycleEnd = function (handler) {
        this.onCycleEndFn = handler;
    };

    Farmer.prototype.loadTargets = function (callback) {
        const pos = this.village.getPosition();

        twoMapData.load((loadedTargets) => {
            this.targets = calcDistances(loadedTargets, pos);
            this.targets = filterTargets(this.targets, pos);
            this.targets = sortTargets(this.targets);
            this.targets = this.targets.slice(0, localSettings[SETTINGS.TARGET_LIMIT]);

            if (typeof callback === 'function') {
                callback(this.targets);
            }

            debug(2, 'village %d targets %o', this.villageId, this.targets.map(village => village.id));
            debug(3, 'village %d detailed targets %o', this.villageId, this.targets);

            // make sure villages area are pre-loaded
            for (const target of this.targets) {
                $mapData.loadTownData(target.x, target.y, 1, 1);
            }
        });
    };

    Farmer.prototype.getTargets = function () {
        return this.targets;
    };

    Farmer.prototype.getIndex = function () {
        return this.index;
    };

    Farmer.prototype.getVillage = function () {
        return this.village;
    };

    Farmer.prototype.isRunning = function () {
        return this.running;
    };

    Farmer.prototype.isInitialized = function () {
        return this.initialized;
    };

    Farmer.prototype.removeTarget = function (targetId) {
        if (typeof targetId !== 'number' || !this.targets) {
            return false;
        }

        this.targets = this.targets.filter(function (target) {
            return target.id !== targetId;
        });

        return true;
    };

    Farmer.prototype.getId = function () {
        return this.villageId;
    };

    const createFarmer = function (villageId) {
        const groupsOnly = localSettings[SETTINGS.GROUP_ONLY];

        villageId = parseInt(villageId, 10);

        if (groupsOnly.length && !onlyVillages.includes(villageId)) {
            return false;
        }

        if (ignoredVillages.includes(villageId)) {
            return false;
        }

        let farmer = farmOverflow.getFarmer(villageId);

        if (!farmer) {
            farmer = new Farmer(villageId);
            farmers.push(farmer);
        }

        return farmer;
    };

    const createFarmers = function () {
        utils.each($player.getVillages(), function (village, villageId) {
            createFarmer(villageId);
        });

        eventQueue.trigger(eventTypeProvider.FARM_OVERFLOW_FARMER_VILLAGES_UPDATED);
    };

    /**
     * Clean farmer instances by removing villages based on
     * groups-only, only-villages and ignore-villages group filters.
     */
    const flushFarmers = function () {
        const groupsOnly = localSettings[SETTINGS.GROUP_ONLY];
        const removeIds = [];

        farmers.forEach(function (farmer) {
            const villageId = farmer.getId();

            if (groupsOnly.length && !onlyVillages.includes(villageId)) {
                removeIds.push(villageId);
            } else if (ignoredVillages.includes(villageId)) {
                removeIds.push(villageId);
            }
        });

        if (removeIds.length) {
            removeIds.forEach(function (removeId) {
                removeFarmer(removeId);
            });

            eventQueue.trigger(eventTypeProvider.FARM_OVERFLOW_FARMER_VILLAGES_UPDATED);
        }
    };

    const removeFarmer = function (farmerId) {
        for (let i = 0; i < farmers.length; i++) {
            if (farmers[i].getId() === farmerId) {
                farmers[i].stop(ERROR_TYPES.KILL_FARMER);
                farmers.splice(i, i + 1);

                return true;
            }
        }

        return false;
    };

    const farmerStep = function (status) {
        persistentRunningUpdate();

        if (!farmers.length) {
            debug(1, 'farmerStep: no active farmers');
            activeFarmer = false;
        } else if (farmerIndex >= farmers.length) {
            debug(1, 'farmerStep: cycle end');
            farmerIndex = 0;
            activeFarmer = false;
            nextCycleDate = timeHelper.gameTime() + getCycleInterval();
            eventQueue.trigger(eventTypeProvider.FARM_OVERFLOW_CYCLE_END);
        } else {
            activeFarmer = farmers[farmerIndex];
        }

        if (activeFarmer) {
            activeFarmer.onCycleEnd(function (reason) {
                if (reason !== ERROR_TYPES.USER_STOP) {
                    debug(1, 'farmerStep: farmer finished, select next farmer');
                    farmerIndex++;
                    farmerStep();
                }
            });

            if (status === CYCLE_BEGIN) {
                debug(1, 'farmerStep: cycle start');
                nextCycleDate = null;
                eventQueue.trigger(eventTypeProvider.FARM_OVERFLOW_CYCLE_BEGIN);
            }

            activeFarmer.start();
        } else {
            cycleTimer = setTimeout(function () {
                cycleTimer = null;
                farmerIndex = 0;
                nextCycleDate = null;
                eventQueue.trigger(eventTypeProvider.FARM_OVERFLOW_CYCLE_BEGIN);
                farmerStep();
            }, getCycleInterval());
        }
    };

    const isTarget = function (targetId) {
        for (let i = 0; i < farmers.length; i++) {
            const farmer = farmers[i];
            const targets = farmer.getTargets();

            for (let j = 0; j < targets.length; j++) {
                const target = targets[j];

                if (target.id === targetId) {
                    return true;
                }
            }
        }

        return false;
    };

    const removeTarget = function (targetId) {
        farmers.forEach(function (farmer) {
            farmer.removeTarget(targetId);
        });
    };

    const reloadTargets = function () {
        twoMapData.load(function () {
            farmers.forEach(function (farmer) {
                farmer.loadTargets();
            });
        }, true);
    };

    const farmOverflow = {};

    farmOverflow.init = function () {
        debug(1, 'initialized');

        initialized = true;
        logs = Lockr.get(STORAGE_KEYS.LOGS, []);
        exceptionLogs = Lockr.get(STORAGE_KEYS.EXCEPTION_LOGS, {});
        $player = modelDataService.getSelectedCharacter();
        unitsData = modelDataService.getGameData().getUnitsObject();

        settings = new Settings({
            settingsMap: SETTINGS_MAP,
            storageKey: STORAGE_KEYS.SETTINGS
        });

        settings.onChange(function (changes, updates, _flag) {
            debug(1, 'settings changes: %o updates: %o', changes, updates);

            localSettings = settings.getAll();

            if (_flag === IGNORE_UPDATES) {
                return;
            }

            if (updates[UPDATES.PRESET]) {
                processPresets();
            }

            if (updates[UPDATES.GROUPS]) {
                updateGroupVillages();
            }

            if (updates[UPDATES.TARGETS]) {
                reloadTargets();
            }

            if (updates[UPDATES.VILLAGES]) {
                flushFarmers();
                createFarmers();
            }

            if (updates[UPDATES.LOGS]) {
                trimAndSaveLogs();
            }

            if (updates[UPDATES.INTERVAL_TIMERS]) {
                reloadTimers();
            }
        });

        localSettings = settings.getAll();
        debug(1, 'settings %O', localSettings);

        validGroups(IGNORE_UPDATES);
        updateGroupVillages();
        createFarmers();

        ready(function () {
            processPresets();
        }, 'presets');

        ready(function () {
            farmers.forEach(function (farmer) {
                farmer.loadTargets();
            });
        }, 'minimap_data');

        $rootScope.$on(eventTypeProvider.ARMY_PRESET_UPDATE, presetListener);
        $rootScope.$on(eventTypeProvider.ARMY_PRESET_DELETED, presetListener);
        $rootScope.$on(eventTypeProvider.GROUPS_VILLAGE_LINKED, villageGroupLink);
        $rootScope.$on(eventTypeProvider.GROUPS_VILLAGE_UNLINKED, villageGroupUnlink);
        $rootScope.$on(eventTypeProvider.GROUPS_DESTROYED, removedGroupListener);
        $rootScope.$on(eventTypeProvider.COMMAND_SENT, commandSentListener);
        $rootScope.$on(eventTypeProvider.MESSAGE_ERROR, commandErrorListener);
        $rootScope.$on(eventTypeProvider.REPORT_NEW, reportListener);
    };

    farmOverflow.start = function () {
        if (running) {
            debug(1, 'start: fail "%s"', ERROR_TYPES.ALREADY_RUNNING);
            return false;
        }

        if (!selectedPresets.length) {
            debug(1, 'start: fail "%s"', ERROR_TYPES.NO_SELECTED_PRESET);

            eventQueue.trigger(eventTypeProvider.FARM_OVERFLOW_STOP, {
                reason: ERROR_TYPES.NO_PRESETS
            });

            return false;
        }

        running = true;

        const readyFarmers = [];

        farmers.forEach(function (farmer) {
            readyFarmers.push(new Promise(function (resolve) {
                farmer.init().then(resolve);
            }));
        });

        if (!readyFarmers.length) {
            debug(1, 'start: fail "%s"', ERROR_TYPES.NO_PRESETS);
            running = false;
            return false;
        }

        Promise.all(readyFarmers).then(function () {
            debug(1, 'start: all farmers ready');
            farmerStep(CYCLE_BEGIN);
        });

        persistentRunningUpdate();
        persistentRunningStart();

        eventQueue.trigger(eventTypeProvider.FARM_OVERFLOW_START);
        debug(1, 'start: success');

        addLog(LOG_TYPES.FARM_START);
    };

    farmOverflow.stop = function (reason = STATUS.USER_STOP) {
        if (activeFarmer) {
            activeFarmer.stop(reason);
            
            if (reason !== STATUS.USER_STOP) {
                nextCycleDate = timeHelper.gameTime() + getCycleInterval();
            }

            eventQueue.trigger(eventTypeProvider.FARM_OVERFLOW_CYCLE_END, reason);
        } else {
            nextCycleDate = null;
        }

        running = false;

        stopTimers();

        eventQueue.trigger(eventTypeProvider.FARM_OVERFLOW_STOP, {
            reason: reason
        });

        persistentRunningStop();

        if (reason === STATUS.USER_STOP) {
            addLog(LOG_TYPES.FARM_STOP);
        }
    };

    farmOverflow.getFarmer = function (farmerId) {
        return farmers.find(function (farmer) {
            return farmer.getId() === farmerId;
        });
    };

    farmOverflow.getFarmers = function () {
        return farmers;
    };

    farmOverflow.getSettings = function () {
        return settings;
    };

    farmOverflow.getExceptionVillages = function () {
        return {
            included: includedVillages,
            ignored: ignoredVillages
        };
    };

    farmOverflow.getExceptionLogs = function () {
        return exceptionLogs;
    };

    farmOverflow.isInitialized = function () {
        return initialized;
    };

    farmOverflow.isRunning = function () {
        return running;
    };

    farmOverflow.getLogs = function () {
        return logs;
    };

    farmOverflow.clearLogs = function () {
        logs = [];
        Lockr.set(STORAGE_KEYS.LOGS, logs);
        eventQueue.trigger(eventTypeProvider.FARM_OVERFLOW_LOGS_UPDATED);

        return logs;
    };

    farmOverflow.getNextCycleDate = function () {
        return nextCycleDate;
    };

    farmOverflow.getCycleInterval = getCycleInterval;

    return farmOverflow;
});
