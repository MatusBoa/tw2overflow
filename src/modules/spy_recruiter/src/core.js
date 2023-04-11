define('two/___spy_recruiter_id', [
    'two/Settings',
    'two/___spy_recruiter_id/settings',
    'two/___spy_recruiter_id/settings/map',
    'two/___spy_recruiter_id/settings/updates',
    'two/ready',
    'two/utils',
    'two/debug',
    'queues/EventQueue',
    'conf/spyTypes',
    'conf/buildingTypes'
], function (
    Settings,
    SETTINGS,
    SETTINGS_MAP,
    UPDATES,
    ready,
    utils,
    setupDebug,
    eventQueue,
    SPY_TYPES,
    BUILDING_TYPES
) {
    let initialized = false;
    let running = false;
    let settings;
    let localSettings;
    let intervalId;

    const debug = setupDebug('___spy_recruiter_id');

    let groupList;
    let worldConfig;

    const preserve = {};
    let selectedVillages = [];
    const spyTechNeeded = {
        2: 'camouflage',
        3: 'switch_weapons',
        4: 'dummies',
        5: 'exchange'
    };

    const STORAGE_KEYS = {
        SETTINGS: '___spy_recruiter_id_settings'
    };

    const RESOURCE_TYPES = ['wood', 'clay', 'iron'];

    const updateSelectedVillages = function () {
        selectedVillages = [];

        const enabledGroups = localSettings[SETTINGS.ENABLED_GROUPS];

        if (enabledGroups.length) {
            for (const groupId of enabledGroups) {
                for (const villageId of groupList.getGroupVillageIds(groupId)) {
                    const playerVillage = modelDataService.getSelectedCharacter().getVillage(villageId);

                    if (playerVillage) {
                        selectedVillages.push(playerVillage);
                    }
                }
            }
        } else {
            selectedVillages = Object.values(modelDataService.getSelectedCharacter().getVillages());
        }

        debug(1, 'enabled groups %o', enabledGroups);
        debug(1, 'selected villages %o', selectedVillages.map(village => village.getId()));
    };

    const updatePreserveResources = function () {
        preserve.wood = localSettings[SETTINGS.PRESERVE_WOOD];
        preserve.clay = localSettings[SETTINGS.PRESERVE_CLAY];
        preserve.iron = localSettings[SETTINGS.PRESERVE_IRON];
    };

    const getAffordableSpies = function (village) {
        buildingService.updateBuilding(village, BUILDING_TYPES.TAVERN);

        const scoutingInfo = village.getScoutingInfo();
        const emitData = [];
        const villageResources = village.getResources().getComputed();
        const buildingData = village.getBuildingData();
        const tavernData = buildingData.getDataForBuilding(BUILDING_TYPES.TAVERN);
        const tavernResearches = tavernData.researches;

        if (!tavernData.level) {
            return emitData;
        }

        const availableResources = {};
        RESOURCE_TYPES.forEach(function (type) {
            availableResources[type] = Math.max(0, villageResources[type].currentStock - preserve[type]);
        });

        for (const spy of scoutingInfo.getSpies()) {
            if (spy.type !== SPY_TYPES.NO_SPY) {
                continue;
            }

            // first spy don't need any research
            if (spy.id !== 1) {
                const tech = spyTechNeeded[spy.id];

                if (!tavernResearches[tech].active) {
                    continue;
                }
            }

            const spyCost = worldConfig.getSpyCosts(spy.id);

            const sulficientResources = RESOURCE_TYPES.every(function (type) {
                return availableResources[type] >= spyCost[type];
            });

            if (!sulficientResources) {
                break;
            }

            RESOURCE_TYPES.forEach(function (type) {
                availableResources[type] -= spyCost[type];
            });

            emitData.push({
                village_id: village.getId(),
                slot: spy.id
            });

            if (localSettings[SETTINGS.RECRUIT_SINGLE_SPY]) {
                break;
            }
        }

        return emitData;
    };

    const massRecruitSpies = function () {
        debug(1, 'starting mass recruit cycle');

        const emitData = [];

        for (const village of selectedVillages) {
            emitData.push(...getAffordableSpies(village));
        }

        debug(1, 'spy recruit emit data %o', emitData);

        for (const data of emitData) {
            socketService.emit(routeProvider.SCOUTING_RECRUIT, data);
        }
    };

    const startRecruitCycle = function () {
        running = true;
        massRecruitSpies();
        intervalId = setInterval(massRecruitSpies, localSettings[SETTINGS.CHECK_INTERVAL]);
    };

    const stopRecruitCycle = function () {
        running = false;
        clearInterval(intervalId);
    };

    const ___spy_recruiter_id = {};

    ___spy_recruiter_id.init = function () {
        debug(1, 'initialized');

        initialized = true;

        worldConfig = modelDataService.getWorldConfig();
        groupList = modelDataService.getGroupList();

        settings = new Settings({
            settingsMap: SETTINGS_MAP,
            storageKey: STORAGE_KEYS.SETTINGS
        });

        settings.onChange(function (changes, updates) {
            debug(1, 'settings changes: %o updates: %o', changes, updates);

            localSettings = settings.getAll();

            if (updates[UPDATES.PRESERVE_RESOURSES]) {
                updatePreserveResources();
            }

            if (updates[UPDATES.GROUPS]) {
                updateSelectedVillages();
            }

            if (running && updates[UPDATES.UPDATE_INTERVAL]) {
                stopRecruitCycle();
                startRecruitCycle();
            }
        });

        localSettings = settings.getAll();
        debug(1, 'settings %O', localSettings);

        $rootScope.$on(eventTypeProvider.GROUPS_CREATED, updateSelectedVillages);
        $rootScope.$on(eventTypeProvider.GROUPS_DESTROYED, updateSelectedVillages);
        $rootScope.$on(eventTypeProvider.GROUPS_VILLAGE_LINKED, updateSelectedVillages);
        $rootScope.$on(eventTypeProvider.GROUPS_VILLAGE_UNLINKED, updateSelectedVillages);

        ready(function () {
            updateSelectedVillages();
            updatePreserveResources();
        }, 'all_villages_ready');
    };

    ___spy_recruiter_id.start = function () {
        startRecruitCycle();
        eventQueue.trigger(eventTypeProvider.___spy_recruiter_id_START);
    };

    ___spy_recruiter_id.stop = function () {
        stopRecruitCycle();
        eventQueue.trigger(eventTypeProvider.___spy_recruiter_id_STOP);
    };

    ___spy_recruiter_id.getSettings = function () {
        return settings;
    };

    ___spy_recruiter_id.isInitialized = function () {
        return initialized;
    };

    ___spy_recruiter_id.isRunning = function () {
        return running;
    };

    return ___spy_recruiter_id;
});
