define('two/autoMinter', [
    'two/Settings',
    'two/autoMinter/settings',
    'two/autoMinter/settings/map',
    'two/autoMinter/settings/updates',
    'two/ready',
    'two/utils',
    'queues/EventQueue',
    'two/debug'
], function (
    Settings,
    SETTINGS,
    SETTINGS_MAP,
    UPDATES,
    ready,
    utils,
    eventQueue,
    setupDebug
) {
    let initialized = false;
    let running = false;
    let settings;
    let localSettings;
    let intervalId;

    const debug = setupDebug('___auto_minter_id');

    let coinCost;
    let groupList;

    const preserve = {};
    let selectedVillages = [];

    const STORAGE_KEYS = {
        SETTINGS: 'auto_minter_settings'
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
        debug(2, 'selected villages detailed %o', selectedVillages);
    };

    const updatePreserveResources = function () {
        preserve.wood = localSettings[SETTINGS.PRESERVE_WOOD];
        preserve.clay = localSettings[SETTINGS.PRESERVE_CLAY];
        preserve.iron = localSettings[SETTINGS.PRESERVE_IRON];
    };

    const getVillageMaxCoins = function (village) {
        const academyLevel = village.getBuildingData().getBuildingLevel('academy');

        if (!academyLevel) {
            debug(2, 'village %d do not have academy', village.getId());
            return false;
        }

        const maxCoinsPerResource = [];
        const villageResources = village.getResources().getComputed();

        for (const resourceType of RESOURCE_TYPES) {
            const available = Math.max(0, villageResources[resourceType].currentStock - preserve[resourceType]);
            const maxCoins = Math.floor(available / coinCost[resourceType]);
            maxCoinsPerResource.push(maxCoins);
            debug(2, 'village %d %s maximum coins: %d', village.getId(), resourceType, maxCoins);
        }

        const villageMaxCoins = Math.min(...maxCoinsPerResource);

        debug(2, 'village %d maximum coins: %d', village.getId(), villageMaxCoins);

        if (!villageMaxCoins) {
            return false;
        }

        return {
            village_id: village.getId(),
            amount: villageMaxCoins
        };
    };

    const massCoinVillages = function () {
        debug(1, 'starting mass mint cycle');

        const massMintVillages = [];

        for (const village of selectedVillages) {
            const villageMaxCoins = getVillageMaxCoins(village);

            if (villageMaxCoins) {
                massMintVillages.push(villageMaxCoins);
            }
        }

        debug(1, 'mass mint cycle data: %o', massMintVillages);

        if (!massMintVillages.length) {
            return;
        }

        socketService.emit(routeProvider.MASS_MINT_COINS, {
            villages: massMintVillages
        });
    };

    const startChecker = function () {
        running = true;
        massCoinVillages();
        intervalId = setInterval(massCoinVillages, localSettings[SETTINGS.CHECK_INTERVAL]);
    };

    const stopChecker = function () {
        running = false;
        clearInterval(intervalId);
    };

    const autoMinter = {};

    autoMinter.init = function () {
        debug(1, 'initialized');

        initialized = true;

        coinCost = modelDataService.getGameData().getCostsPerCoin();
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
                stopChecker();
                startChecker();
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

    autoMinter.start = function () {
        debug(1, 'start');
        startChecker();
        eventQueue.trigger(eventTypeProvider.AUTO_MINTER_START);
    };

    autoMinter.stop = function () {
        debug(1, 'stop');
        stopChecker();
        eventQueue.trigger(eventTypeProvider.AUTO_MINTER_STOP);
    };

    autoMinter.getSettings = function () {
        return settings;
    };

    autoMinter.isInitialized = function () {
        return initialized;
    };

    autoMinter.isRunning = function () {
        return running;
    };

    return autoMinter;
});
