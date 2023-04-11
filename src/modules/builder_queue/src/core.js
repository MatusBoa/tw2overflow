define('two/builderQueue', [
    'two/ready',
    'two/utils',
    'two/Settings',
    'two/builderQueue/settings',
    'two/builderQueue/settings/map',
    'two/builderQueue/settings/updates',
    'two/builderQueue/sequenceStatus',
    'conf/upgradeabilityStates',
    'conf/buildingTypes',
    'conf/locationTypes',
    'queues/EventQueue',
    'Lockr',
    'helper/time'
], function (
    ready,
    utils,
    Settings,
    SETTINGS,
    SETTINGS_MAP,
    UPDATES,
    SEQUENCE_STATUS,
    UPGRADEABILITY_STATES,
    BUILDING_TYPES,
    LOCATION_TYPES,
    eventQueue,
    Lockr,
    timeHelper
) {
    const buildingService = injector.get('buildingService');
    const premiumActionService = injector.get('premiumActionService');
    const buildingQueueService = injector.get('buildingQueueService');
    let initialized = false;
    let running = false;
    let intervalCheckId;
    let intervalInstantCheckId;
    let buildingSequenceLimit;
    const ANALYSES_PER_MINUTE = 1;
    const ANALYSES_PER_MINUTE_INSTANT_FINISH = 10;
    const VILLAGE_BUILDINGS = {};
    const LOGS_LIMIT = 500;
    let groupList;
    let $player;
    let logs;
    let sequencesAvail = true;
    let settings;
    let localSettings;
    const STORAGE_KEYS = {
        LOGS: 'builder_queue_log',
        SETTINGS: 'builder_queue_settings'
    };

    /**
     * Loop all player villages, check if ready and init the building analyse
     * for each village.
     */
    const analyseVillages = function () {
        const villageIds = getVillageIds();

        if (!sequencesAvail) {
            builderQueue.stop();
            return false;
        }

        villageIds.forEach(function (villageId) {
            const village = $player.getVillage(villageId);
            const readyState = village.checkReadyState();
            const queue = village.buildingQueue;
            const jobs = queue.getAmountJobs();

            if (jobs === queue.getUnlockedSlots()) {
                return false;
            }

            if (!readyState.buildingQueue || !readyState.buildings) {
                return false;
            }

            analyseVillageBuildings(village);
        });
    };

    const analyseVillagesInstantFinish = function () {
        const villageIds = getVillageIds();

        villageIds.forEach(function (villageId) {
            const village = $player.getVillage(villageId);
            const queue = village.buildingQueue;

            if (queue.getAmountJobs()) {
                const jobs = queue.getQueue();

                jobs.forEach(function (job) {
                    if (buildingQueueService.canBeFinishedForFree(job, village)) {
                        premiumActionService.instantBuild(job, LOCATION_TYPES.MASS_SCREEN, true, villageId);
                    }
                });
            }
        });
    };

    const initializeAllVillages = function () {
        const villageIds = getVillageIds();

        villageIds.forEach(function (villageId) {
            const village = $player.getVillage(villageId);

            if (!village.isInitialized()) {
                villageService.initializeVillage(village);
            }
        });
    };

    /**
     * Generate an Array with all player's village IDs.
     *
     * @return {Array}
     */
    const getVillageIds = function () {
        const groupVillages = localSettings[SETTINGS.GROUP_VILLAGES];
        let villages = [];

        if (groupVillages) {
            villages = groupList.getGroupVillageIds(groupVillages);
            villages = villages.filter(function (vid) {
                return $player.getVillage(vid);
            });
        } else {
            utils.each($player.getVillages(), function (village) {
                villages.push(village.getId());
            });
        }

        return villages;
    };

    /**
     * Loop all village buildings, start build job if available.
     *
     * @param {VillageModel} village
     */
    const analyseVillageBuildings = function (village) {
        const buildingLevels = angular.copy(village.buildingData.getBuildingLevels());
        const currentQueue = village.buildingQueue.getQueue();
        const sequence = angular.copy(VILLAGE_BUILDINGS);
        const sequences = localSettings[SETTINGS.BUILDING_SEQUENCES];
        const activeSequenceId = localSettings[SETTINGS.ACTIVE_SEQUENCE];
        const activeSequence = sequences[activeSequenceId];

        currentQueue.forEach(function (job) {
            buildingLevels[job.building]++;
        });

        if (checkVillageBuildingLimit(buildingLevels)) {
            return false;
        }

        for (const buildingName of activeSequence) {
            if (++sequence[buildingName] > buildingLevels[buildingName]) {
                buildingService.compute(village);

                checkAndUpgradeBuilding(village, buildingName, function (jobAdded, data) {
                    if (jobAdded && data.job) {
                        eventQueue.trigger(eventTypeProvider.BUILDER_QUEUE_JOB_STARTED, data.job);
                        addLog(village.getId(), data.job);
                    }
                });

                break;
            }
        }
    };

    /**
     * Init a build job
     *
     * @param {VillageModel} village
     * @param {String} buildingName - Building to be build.
     * @param {Function} callback
     */
    const checkAndUpgradeBuilding = function (village, buildingName, callback) {
        const upgradeability = checkBuildingUpgradeability(village, buildingName);

        if (upgradeability === UPGRADEABILITY_STATES.POSSIBLE) {
            upgradeBuilding(village, buildingName, function (data) {
                callback(true, data);
            });
        } else if (upgradeability === UPGRADEABILITY_STATES.NOT_ENOUGH_FOOD) {
            if (localSettings[SETTINGS.PRIORIZE_FARM]) {
                const limitFarm = buildingSequenceLimit[BUILDING_TYPES.FARM];
                const villageFarm = village.getBuildingData().getDataForBuilding(BUILDING_TYPES.FARM);

                if (villageFarm.level < limitFarm) {
                    upgradeBuilding(village, BUILDING_TYPES.FARM, function (data) {
                        callback(true, data);
                    });
                }
            }
        }

        callback(false);
    };

    const upgradeBuilding = function (village, buildingName, callback) {
        socketService.emit(routeProvider.VILLAGE_UPGRADE_BUILDING, {
            building: buildingName,
            village_id: village.getId(),
            location: LOCATION_TYPES.MASS_SCREEN,
            premium: false
        }, callback);
    };

    /**
     * Can't just use the .upgradeability value because of the preserve resources setting.
     */
    const checkBuildingUpgradeability = function (village, buildingName) {
        const buildingData = village.getBuildingData().getDataForBuilding(buildingName);

        if (buildingData.upgradeability === UPGRADEABILITY_STATES.POSSIBLE) {
            const nextLevelCosts = buildingData.nextLevelCosts;
            const resources = village.getResources().getComputed();

            if (
                resources.clay.currentStock - localSettings[SETTINGS.PRESERVE_CLAY] < nextLevelCosts.clay ||
                resources.iron.currentStock - localSettings[SETTINGS.PRESERVE_IRON] < nextLevelCosts.iron ||
                resources.wood.currentStock - localSettings[SETTINGS.PRESERVE_WOOD] < nextLevelCosts.wood
            ) {
                return UPGRADEABILITY_STATES.NOT_ENOUGH_RESOURCES;
            }
        }

        return buildingData.upgradeability;
    };

    /**
     * Check if all buildings from the sequence already reached
     * the specified level.
     *
     * @param {Object} buildingLevels - Current buildings level from the village.
     * @return {Boolean} True if the levels already reached the limit.
     */
    const checkVillageBuildingLimit = function (buildingLevels) {
        for (const buildingName in buildingLevels) {
            if (buildingLevels[buildingName] < buildingSequenceLimit[buildingName]) {
                return false;
            }
        }

        return true;
    };

    /**
     * Check if the building sequence is valid by analysing if the
     * buildings exceed the maximum level.
     *
     * @param {Array} sequence
     * @return {Boolean}
     */
    const validSequence = function (sequence) {
        const buildingData = modelDataService.getGameData().getBuildings();

        for (let i = 0; i < sequence.length; i++) {
            const building = sequence[i];

            if (++sequence[building] > buildingData[building].max_level) {
                return false;
            }
        }

        return true;
    };

    /**
     * Get the level max for each building.
     *
     * @param {String} sequenceId
     * @return {Object} Maximum level for each building.
     */
    const getSequenceLimit = function (sequenceId) {
        const sequences = localSettings[SETTINGS.BUILDING_SEQUENCES];
        const sequence = sequences[sequenceId];
        const sequenceLimit = angular.copy(VILLAGE_BUILDINGS);

        sequence.forEach(function (buildingName) {
            sequenceLimit[buildingName]++;
        });

        return sequenceLimit;
    };

    const addLog = function (villageId, jobData) {
        const data = {
            time: timeHelper.gameTime(),
            villageId: villageId,
            building: jobData.building,
            level: jobData.level
        };

        logs.unshift(data);

        if (logs.length > LOGS_LIMIT) {
            logs.splice(logs.length - LOGS_LIMIT, logs.length);
        }

        Lockr.set(STORAGE_KEYS.LOGS, logs);

        return true;
    };

    const builderQueue = {};

    builderQueue.start = function () {
        if (!sequencesAvail) {
            eventQueue.trigger(eventTypeProvider.BUILDER_QUEUE_NO_SEQUENCES);
            return false;
        }

        running = true;
        intervalCheckId = setInterval(analyseVillages, 60000 / ANALYSES_PER_MINUTE);
        intervalInstantCheckId = setInterval(analyseVillagesInstantFinish, 60000 / ANALYSES_PER_MINUTE_INSTANT_FINISH);
        
        ready(function () {
            initializeAllVillages();
            analyseVillages();
            analyseVillagesInstantFinish();
        }, ['all_villages_ready']);

        eventQueue.trigger(eventTypeProvider.BUILDER_QUEUE_START);
    };

    builderQueue.stop = function () {
        running = false;
        clearInterval(intervalCheckId);
        clearInterval(intervalInstantCheckId);
        eventQueue.trigger(eventTypeProvider.BUILDER_QUEUE_STOP);
    };

    builderQueue.isRunning = function () {
        return running;
    };

    builderQueue.isInitialized = function () {
        return initialized;
    };

    builderQueue.getSettings = function () {
        return settings;
    };

    builderQueue.getLogs = function () {
        return logs;
    };

    builderQueue.clearLogs = function () {
        logs = [];
        Lockr.set(STORAGE_KEYS.LOGS, logs);
        eventQueue.trigger(eventTypeProvider.BUILDER_QUEUE_CLEAR_LOGS);
    };

    builderQueue.addBuildingSequence = function (id, sequence) {
        const sequences = localSettings[SETTINGS.BUILDING_SEQUENCES];

        if (id in sequences) {
            return SEQUENCE_STATUS.SEQUENCE_EXISTS;
        }

        if (!Array.isArray(sequence)) {
            return SEQUENCE_STATUS.SEQUENCE_INVALID;
        }

        sequences[id] = sequence;
        settings.set(SETTINGS.BUILDING_SEQUENCES, sequences, {
            quiet: true
        });
        eventQueue.trigger(eventTypeProvider.BUILDER_QUEUE_BUILDING_SEQUENCES_ADDED, id);

        return SEQUENCE_STATUS.SEQUENCE_SAVED;
    };

    builderQueue.updateBuildingSequence = function (id, sequence) {
        const sequences = localSettings[SETTINGS.BUILDING_SEQUENCES];

        if (!(id in sequences)) {
            return SEQUENCE_STATUS.SEQUENCE_NO_EXISTS;
        }

        if (!Array.isArray(sequence) || !validSequence(sequence)) {
            return SEQUENCE_STATUS.SEQUENCE_INVALID;
        }

        sequences[id] = sequence;
        settings.set(SETTINGS.BUILDING_SEQUENCES, sequences, {
            quiet: true
        });
        eventQueue.trigger(eventTypeProvider.BUILDER_QUEUE_BUILDING_SEQUENCES_UPDATED, id);

        return SEQUENCE_STATUS.SEQUENCE_SAVED;
    };

    builderQueue.removeSequence = function (id) {
        const sequences = localSettings[SETTINGS.BUILDING_SEQUENCES];

        if (!(id in sequences)) {
            return SEQUENCE_STATUS.SEQUENCE_NO_EXISTS;
        }

        delete sequences[id];
        settings.set(SETTINGS.BUILDING_SEQUENCES, sequences, {
            quiet: true
        });
        eventQueue.trigger(eventTypeProvider.BUILDER_QUEUE_BUILDING_SEQUENCES_REMOVED, id);
    };

    builderQueue.init = function () {
        initialized = true;
        logs = Lockr.get(STORAGE_KEYS.LOGS, [], true);
        $player = modelDataService.getSelectedCharacter();
        groupList = modelDataService.getGroupList();
        
        settings = new Settings({
            settingsMap: SETTINGS_MAP,
            storageKey: STORAGE_KEYS.SETTINGS
        });

        settings.onChange(function (changes, updates, opt) {
            localSettings = settings.getAll();

            if (running) {
                if (updates[UPDATES.ANALYSE]) {
                    analyseVillages();
                }
            }

            if (!opt.quiet) {
                eventQueue.trigger(eventTypeProvider.BUILDER_QUEUE_SETTINGS_CHANGE);
            }
        });

        localSettings = settings.getAll();

        for (const buildingName in BUILDING_TYPES) {
            VILLAGE_BUILDINGS[BUILDING_TYPES[buildingName]] = 0;
        }

        sequencesAvail = Object.keys(localSettings[SETTINGS.BUILDING_SEQUENCES]).length;
        buildingSequenceLimit = sequencesAvail ? getSequenceLimit(localSettings[SETTINGS.ACTIVE_SEQUENCE]) : false;

        $rootScope.$on(eventTypeProvider.BUILDING_LEVEL_CHANGED, function (event, data) {
            if (!running) {
                return false;
            }

            setTimeout(function () {
                const village = $player.getVillage(data.village_id);
                analyseVillageBuildings(village);
            }, 1000);
        });
    };

    return builderQueue;
});
