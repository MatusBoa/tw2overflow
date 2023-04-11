define('two/builderQueue/ui', [
    'two/ui',
    'two/builderQueue',
    'two/utils',
    'two/ready',
    'two/Settings',
    'two/builderQueue/settings',
    'two/builderQueue/settings/map',
    'two/builderQueue/sequenceStatus',
    'conf/buildingTypes',
    'two/EventScope',
    'queues/EventQueue',
    'helper/time'
], function (
    interfaceOverflow,
    builderQueue,
    utils,
    ready,
    Settings,
    SETTINGS,
    SETTINGS_MAP,
    SEQUENCE_STATUS,
    BUILDING_TYPES,
    EventScope,
    eventQueue,
    timeHelper
) {
    let $scope;
    let $button;
    const groupList = modelDataService.getGroupList();
    const buildingsLevelPoints = {};
    let running = false;
    let gameDataBuildings;
    const editorView = {
        sequencesAvail: true,
        modal: {}
    };
    let settings;
    const settingsView = {
        sequencesAvail: true
    };
    const logsView = {};
    const TAB_TYPES = {
        SETTINGS: 'settings',
        SEQUENCES: 'sequences',
        LOGS: 'logs'
    };
    const villagesInfo = {};
    const villagesLabel = {};
    let unsavedChanges = false;
    let oldCloseWindow;
    let ignoreInputChange = false;

    // TODO: make it shared with other modules
    const loadVillageInfo = function (villageId) {
        if (villagesInfo[villageId]) {
            return villagesInfo[villageId];
        }

        villagesInfo[villageId] = true;
        villagesLabel[villageId] = 'LOADING...';

        socketService.emit(routeProvider.MAP_GET_VILLAGE_DETAILS, {
            my_village_id: modelDataService.getSelectedVillage().getId(),
            village_id: villageId,
            num_reports: 1
        }, function (data) {
            villagesInfo[villageId] = {
                x: data.village_x,
                y: data.village_y,
                name: data.village_name,
                last_report: data.last_reports[0]
            };

            villagesLabel[villageId] = `${data.village_name} (${data.village_x}|${data.village_y})`;
        });
    };

    const buildingLevelReached = function (building, level) {
        const buildingData = modelDataService.getSelectedVillage().getBuildingData();
        return buildingData.getBuildingLevel(building) >= level;
    };

    const buildingLevelProgress = function (building, level) {
        const queue = modelDataService.getSelectedVillage().getBuildingQueue().getQueue();
        let progress = false;

        for (const job of queue) {
            if (job.building === building && job.level === level) {
                progress = true;
                break;
            }
        }

        return progress;
    };

    /**
     * Calculate the total of points accumulated ultil the specified level.
     */
    const getLevelScale = function (factor, base, level) {
        return level ? parseInt(Math.round(factor * Math.pow(base, level - 1)), 10) : 0;
    };

    const moveArrayItem = function (obj, oldIndex, newIndex) {
        if (newIndex >= obj.length) {
            let i = newIndex - obj.length + 1;
            
            while (i--) {
                obj.push(undefined);
            }
        }

        obj.splice(newIndex, 0, obj.splice(oldIndex, 1)[0]);
    };

    const parseBuildingSequence = function (sequence) {
        return sequence.map(function (item) {
            return item.building;
        });
    };

    const createBuildingSequence = function (sequenceId, sequence) {
        const status = builderQueue.addBuildingSequence(sequenceId, sequence);

        switch (status) {
            case SEQUENCE_STATUS.SEQUENCE_SAVED: {
                return true;
            }
            case SEQUENCE_STATUS.SEQUENCE_EXISTS: {
                utils.notif('error', $filter('i18n')('error_sequence_exists', $rootScope.loc.ale, 'builder_queue'));
                return false;
            }
            case SEQUENCE_STATUS.SEQUENCE_INVALID: {
                utils.notif('error', $filter('i18n')('error_sequence_invalid', $rootScope.loc.ale, 'builder_queue'));
                return false;
            }
        }
    };

    const selectSome = function (obj) {
        for (const i in obj) {
            if (hasOwn.call(obj, i)) {
                return i;
            }
        }

        return false;
    };

    settingsView.generateSequences = function () {
        const sequences = settings.get(SETTINGS.BUILDING_SEQUENCES);
        const sequencesAvail = Object.keys(sequences).length;

        settingsView.sequencesAvail = sequencesAvail;

        if (!sequencesAvail) {
            return false;
        }

        settingsView.generateBuildingSequence();
        settingsView.generateBuildingSequenceFinal();
        settingsView.updateVisibleBuildingSequence();
    };

    settingsView.generateBuildingSequence = function () {
        const sequenceId = $scope.settings[SETTINGS.ACTIVE_SEQUENCE].value;
        const buildingSequenceRaw = $scope.settings[SETTINGS.BUILDING_SEQUENCES][sequenceId];
        const buildingData = modelDataService.getGameData().getBuildings();
        const buildingLevels = {};

        settingsView.sequencesAvail = !!buildingSequenceRaw;

        if (!settingsView.sequencesAvail) {
            return false;
        }

        for (const building in BUILDING_TYPES) {
            buildingLevels[BUILDING_TYPES[building]] = 0;
        }

        settingsView.buildingSequence = buildingSequenceRaw.map(function (building) {
            const level = ++buildingLevels[building];
            const price = buildingData[building].individual_level_costs[level];
            let state = 'not-reached';

            if (buildingLevelReached(building, level)) {
                state = 'reached';
            } else if (buildingLevelProgress(building, level)) {
                state = 'progress';
            }

            return {
                level: level,
                price: buildingData[building].individual_level_costs[level],
                building: building,
                duration: timeHelper.readableSeconds(price.build_time),
                levelPoints: buildingsLevelPoints[building][level - 1],
                state: state
            };
        });
    };

    settingsView.generateBuildingSequenceFinal = function (_sequenceId) {
        const selectedSequence = $scope.settings[SETTINGS.ACTIVE_SEQUENCE].value;
        const sequenceBuildings = $scope.settings[SETTINGS.BUILDING_SEQUENCES][_sequenceId || selectedSequence];
        const sequenceObj = {};
        const sequence = [];
        
        for (const building in gameDataBuildings) {
            sequenceObj[building] = {
                level: 0,
                order: gameDataBuildings[building].order,
                resources: {
                    wood: 0,
                    clay: 0,
                    iron: 0,
                    food: 0
                },
                points: 0,
                build_time: 0
            };
        }

        sequenceBuildings.forEach(function (building) {
            const level = ++sequenceObj[building].level;
            const costs = gameDataBuildings[building].individual_level_costs[level];

            sequenceObj[building].resources.wood += parseInt(costs.wood, 10);
            sequenceObj[building].resources.clay += parseInt(costs.clay, 10);
            sequenceObj[building].resources.iron += parseInt(costs.iron, 10);
            sequenceObj[building].resources.food += parseInt(costs.food, 10);
            sequenceObj[building].build_time += parseInt(costs.build_time, 10);
            sequenceObj[building].points += buildingsLevelPoints[building][level - 1];
        });

        for (const building in sequenceObj) {
            if (sequenceObj[building].level !== 0) {
                sequence.push({
                    building: building,
                    level: sequenceObj[building].level,
                    order: sequenceObj[building].order,
                    resources: sequenceObj[building].resources,
                    points: sequenceObj[building].points,
                    build_time: sequenceObj[building].build_time
                });
            }
        }

        settingsView.buildingSequenceFinal = sequence;
    };

    settingsView.updateVisibleBuildingSequence = function () {
        const offset = $scope.pagination.buildingSequence.offset;
        const limit = $scope.pagination.buildingSequence.limit;

        settingsView.visibleBuildingSequence = settingsView.buildingSequence.slice(offset, offset + limit);
        $scope.pagination.buildingSequence.count = settingsView.buildingSequence.length;
    };

    settingsView.generateBuildingsLevelPoints = function () {
        const $gameData = modelDataService.getGameData();
        let buildingTotalPoints;

        for(const buildingName in $gameData.data.buildings) {
            const buildingData = $gameData.getBuildingDataForBuilding(buildingName);
            buildingTotalPoints = 0;
            buildingsLevelPoints[buildingName] = [];

            for (let level = 1; level <= buildingData.max_level; level++) {
                const currentLevelPoints = getLevelScale(buildingData.points, buildingData.points_factor, level);
                const levelPoints = currentLevelPoints - buildingTotalPoints;
                buildingTotalPoints += levelPoints;

                buildingsLevelPoints[buildingName].push(levelPoints);
            }
        }
    };

    editorView.moveUp = function () {
        const copy = angular.copy(editorView.buildingSequence);
        let changed = false;

        for (let i = 0; i < copy.length; i++) {
            const item = copy[i];

            if (!item.checked) {
                continue;
            }

            if (i === 0) {
                continue;
            }

            if (copy[i - 1].checked) {
                continue;
            }

            if (copy[i - 1].building === item.building) {
                copy[i - 1].level++;
                item.level--;
                changed = true;
            }

            moveArrayItem(copy, i, i - 1);
        }

        editorView.buildingSequence = copy;
        editorView.updateVisibleBuildingSequence();

        if (changed) {
            unsavedChanges = true;
        }
    };

    editorView.moveDown = function () {
        const copy = angular.copy(editorView.buildingSequence);
        let changed = false;

        for (let i = copy.length - 1; i >= 0; i--) {
            const item = copy[i];

            if (!item.checked) {
                continue;
            }

            if (i === copy.length - 1) {
                continue;
            }

            if (copy[i + 1].checked) {
                continue;
            }

            if (copy[i + 1].building === item.building) {
                copy[i + 1].level--;
                item.level++;
                changed = true;
            }

            moveArrayItem(copy, i, i + 1);
        }

        editorView.buildingSequence = copy;
        editorView.updateVisibleBuildingSequence();
        
        if (changed) {
            unsavedChanges = true;
        }
    };

    editorView.addBuilding = function (building, position, amount = 1) {
        const index = position - 1;
        const newSequence = editorView.buildingSequence.slice();
        const buildingData = {
            level: null,
            building: building,
            checked: false
        };

        for (let i = 0; i < amount; i++) {
            newSequence.splice(index, 0, buildingData);
        }

        editorView.buildingSequence = editorView.updateLevels(newSequence, building);
        editorView.updateVisibleBuildingSequence();
        unsavedChanges = true;

        return true;
    };

    editorView.removeBuilding = function (index) {
        const building = editorView.buildingSequence[index].building;

        editorView.buildingSequence.splice(index, 1);
        editorView.buildingSequence = editorView.updateLevels(editorView.buildingSequence, building);

        editorView.updateVisibleBuildingSequence();
        unsavedChanges = true;
    };

    editorView.updateLevels = function (sequence, building) {
        let buildingLevel = 0;
        const modifiedSequence = [];

        for (let i = 0; i < sequence.length; i++) {
            const item = sequence[i];

            if (item.building === building) {
                if (buildingLevel < gameDataBuildings[building].max_level) {
                    modifiedSequence.push({
                        level: ++buildingLevel,
                        building: building,
                        checked: false
                    });
                }
            } else {
                modifiedSequence.push(item);
            }
        }

        return modifiedSequence;
    };

    editorView.generateBuildingSequence = function () {
        const sequences = settings.get(SETTINGS.BUILDING_SEQUENCES);
        const sequencesAvail = Object.keys(sequences).length;

        editorView.sequencesAvail = sequencesAvail;

        if (!sequencesAvail) {
            return false;
        }

        const sequenceId = editorView.selectedSequence.value;
        const buildingSequenceRaw = sequences[sequenceId];
        const buildingLevels = {};

        for (const building in BUILDING_TYPES) {
            buildingLevels[BUILDING_TYPES[building]] = 0;
        }

        editorView.buildingSequence = buildingSequenceRaw.map(function (building) {
            return {
                level: ++buildingLevels[building],
                building: building,
                checked: false
            };
        });

        editorView.updateVisibleBuildingSequence();
    };

    editorView.updateVisibleBuildingSequence = function () {
        const offset = $scope.pagination.buildingSequenceEditor.offset;
        const limit = $scope.pagination.buildingSequenceEditor.limit;

        editorView.visibleBuildingSequence = editorView.buildingSequence.slice(offset, offset + limit);
        $scope.pagination.buildingSequenceEditor.count = editorView.buildingSequence.length;
    };

    editorView.updateBuildingSequence = function () {
        const selectedSequence = editorView.selectedSequence.value;
        const parsedSequence = parseBuildingSequence(editorView.buildingSequence);
        const status = builderQueue.updateBuildingSequence(selectedSequence, parsedSequence);

        switch (status) {
            case SEQUENCE_STATUS.SEQUENCE_SAVED: {
                unsavedChanges = false;
                break;
            }
            case SEQUENCE_STATUS.SEQUENCE_NO_EXISTS: {
                utils.notif('error', $filter('i18n')('error_sequence_no_exits', $rootScope.loc.ale, 'builder_queue'));
                break;
            }
            case SEQUENCE_STATUS.SEQUENCE_INVALID: {
                utils.notif('error', $filter('i18n')('error_sequence_invalid', $rootScope.loc.ale, 'builder_queue'));
                break;
            }
        }
    };

    editorView.modal.removeSequence = function () {
        const modalScope = $rootScope.$new();

        modalScope.title = $filter('i18n')('title', $rootScope.loc.ale, 'builder_queue_remove_sequence_modal');
        modalScope.text = $filter('i18n')('text', $rootScope.loc.ale, 'builder_queue_remove_sequence_modal');
        modalScope.submitText = $filter('i18n')('remove', $rootScope.loc.ale, 'common');
        modalScope.cancelText = $filter('i18n')('cancel', $rootScope.loc.ale, 'common');
        modalScope.switchColors = true;

        modalScope.submit = function () {
            modalScope.closeWindow();
            builderQueue.removeSequence(editorView.selectedSequence.value);
            unsavedChanges = false;
        };

        modalScope.cancel = function () {
            modalScope.closeWindow();
        };

        windowManagerService.getModal('modal_attention', modalScope);
    };

    editorView.modal.addBuilding = function () {
        const modalScope = $rootScope.$new();
        modalScope.buildings = [];
        modalScope.position = editorView.lastAddedIndex;
        modalScope.indexLimit = editorView.buildingSequence.length + 1;
        modalScope.buildingsData = modelDataService.getGameData().getBuildings();
        modalScope.amount = 1;
        modalScope.selectedBuilding = {
            name: $filter('i18n')(editorView.lastAddedBuilding, $rootScope.loc.ale, 'building_names'),
            value: editorView.lastAddedBuilding
        };

        for (const building in gameDataBuildings) {
            modalScope.buildings.push({
                name: $filter('i18n')(building, $rootScope.loc.ale, 'building_names'),
                value: building
            });
        }

        modalScope.add = function () {
            const building = modalScope.selectedBuilding.value;
            const position = modalScope.position;
            const amount = modalScope.amount;
            const buildingName = $filter('i18n')(building, $rootScope.loc.ale, 'building_names');
            const buildingLimit = gameDataBuildings[building].max_level;

            editorView.lastAddedBuilding = building;
            editorView.lastAddedIndex = position;

            if (editorView.addBuilding(building, position, amount)) {
                modalScope.closeWindow();
                utils.notif('success', $filter('i18n')('add_building_success', $rootScope.loc.ale, 'builder_queue', buildingName, position));
            } else {
                utils.notif('error', $filter('i18n')('add_building_limit_exceeded', $rootScope.loc.ale, 'builder_queue', buildingName, buildingLimit));
            }
        };

        windowManagerService.getModal('!twoverflow_builder_queue_add_building_modal', modalScope);
    };

    editorView.modal.nameSequence = function () {
        const nameSequence = function () {
            const modalScope = $rootScope.$new();
            const selectedSequenceName = editorView.selectedSequence.name;
            const selectedSequence = $scope.settings[SETTINGS.BUILDING_SEQUENCES][selectedSequenceName];
            
            modalScope.name = selectedSequenceName;

            modalScope.submit = function () {
                if (modalScope.name.length < 3) {
                    utils.notif('error', $filter('i18n')('name_sequence_min_lenght', $rootScope.loc.ale, 'builder_queue'));
                    return false;
                }

                if (createBuildingSequence(modalScope.name, selectedSequence)) {
                    modalScope.closeWindow();
                }
            };

            windowManagerService.getModal('!twoverflow_builder_queue_name_sequence_modal', modalScope);
        };

        if (unsavedChanges) {
            const modalScope = $rootScope.$new();
            modalScope.title = $filter('i18n')('clone_warn_changed_sequence_title', $rootScope.loc.ale, 'builder_queue');
            modalScope.text = $filter('i18n')('clone_warn_changed_sequence_text', $rootScope.loc.ale, 'builder_queue');
            modalScope.submitText = $filter('i18n')('clone', $rootScope.loc.ale, 'builder_queue');
            modalScope.cancelText = $filter('i18n')('cancel', $rootScope.loc.ale, 'common');

            modalScope.submit = function () {
                modalScope.closeWindow();
                nameSequence();
            };

            modalScope.cancel = function () {
                modalScope.closeWindow();
            };

            windowManagerService.getModal('modal_attention', modalScope);
        } else {
            nameSequence();
        }
    };

    logsView.updateVisibleLogs = function () {
        const offset = $scope.pagination.logs.offset;
        const limit = $scope.pagination.logs.limit;

        logsView.visibleLogs = logsView.logs.slice(offset, offset + limit);
        $scope.pagination.logs.count = logsView.logs.length;

        logsView.visibleLogs.forEach(function (log) {
            if (log.villageId) {
                loadVillageInfo(log.villageId);
            }
        });
    };

    logsView.clearLogs = function () {
        builderQueue.clearLogs();
    };

    const createSequence = function () {
        const modalScope = $rootScope.$new();
        const initialSequence = [BUILDING_TYPES.HEADQUARTER];

        modalScope.name = '';
        
        modalScope.submit = function () {
            if (modalScope.name.length < 3) {
                utils.notif('error', $filter('i18n')('name_sequence_min_lenght', $rootScope.loc.ale, 'builder_queue'));
                return false;
            }

            if (createBuildingSequence(modalScope.name, initialSequence)) {
                $scope.settings[SETTINGS.ACTIVE_SEQUENCE] = {name: modalScope.name, value: modalScope.name};
                $scope.settings[SETTINGS.BUILDING_SEQUENCES][modalScope.name] = initialSequence;

                saveSettings();

                settingsView.selectedSequence = {name: modalScope.name, value: modalScope.name};
                editorView.selectedSequence = {name: modalScope.name, value: modalScope.name};

                settingsView.generateSequences();
                editorView.generateBuildingSequence();

                modalScope.closeWindow();
                selectTab(TAB_TYPES.SEQUENCES);
            }
        };

        windowManagerService.getModal('!twoverflow_builder_queue_name_sequence_modal', modalScope);
    };

    const selectTab = function (tabType) {
        $scope.selectedTab = tabType;
    };

    const saveSettings = function () {
        settings.setAll(settings.decode($scope.settings));
        unsavedChanges = false;
    };

    const switchBuilder = function () {
        if (builderQueue.isRunning()) {
            builderQueue.stop();
        } else {
            builderQueue.start();
        }
    };

    const confirmDiscardModal = function (onDiscard, onCancel) {
        const modalScope = $rootScope.$new();
        modalScope.title = $filter('i18n')('discard_changes_title', $rootScope.loc.ale, 'builder_queue');
        modalScope.text = $filter('i18n')('discard_changes_text', $rootScope.loc.ale, 'builder_queue');
        modalScope.submitText = $filter('i18n')('discard', $rootScope.loc.ale, 'common');
        modalScope.cancelText = $filter('i18n')('cancel', $rootScope.loc.ale, 'common');
        modalScope.switchColors = true;

        modalScope.submit = function () {
            modalScope.closeWindow();
            onDiscard && onDiscard();
        };

        modalScope.cancel = function () {
            modalScope.closeWindow();
            onCancel && onCancel();
        };

        windowManagerService.getModal('modal_attention', modalScope);
    };

    const confirmCloseWindow = function () {
        if (unsavedChanges) {
            confirmDiscardModal(function onDiscard () {
                oldCloseWindow();
            });
        } else {
            oldCloseWindow();
        }
    };

    const eventHandlers = {
        updateGroups: function () {
            $scope.groups = Settings.encodeList(groupList.getGroups(), {
                type: 'groups',
                disabled: true
            });
        },
        updateSequences: function () {
            const sequences = settings.get(SETTINGS.BUILDING_SEQUENCES);
            
            $scope.sequences = Settings.encodeList(sequences, {
                type: 'keys',
                disabled: false
            });
        },
        generateBuildingSequences: function () {
            settingsView.generateSequences();
        },
        generateBuildingSequencesEditor: function () {
            editorView.generateBuildingSequence();
        },
        updateLogs: function () {
            $scope.logs = builderQueue.getLogs();
            logsView.updateVisibleLogs();
        },
        clearLogs: function () {
            utils.notif('success', $filter('i18n')('logs_cleared', $rootScope.loc.ale, 'builder_queue'));
            eventHandlers.updateLogs();
        },
        buildingSequenceUpdate: function (event, sequenceId) {
            const sequences = settings.get(SETTINGS.BUILDING_SEQUENCES);
            $scope.settings[SETTINGS.BUILDING_SEQUENCES][sequenceId] = sequences[sequenceId];

            if ($scope.settings[SETTINGS.ACTIVE_SEQUENCE].value === sequenceId) {
                settingsView.generateSequences();
            }

            utils.notif('success', $filter('i18n')('sequence_updated', $rootScope.loc.ale, 'builder_queue', sequenceId));
        },
        buildingSequenceAdd: function (event, sequenceId) {
            const sequences = settings.get(SETTINGS.BUILDING_SEQUENCES);
            $scope.settings[SETTINGS.BUILDING_SEQUENCES][sequenceId] = sequences[sequenceId];
            eventHandlers.updateSequences();
            utils.notif('success', $filter('i18n')('sequence_created', $rootScope.loc.ale, 'builder_queue', sequenceId));
        },
        buildingSequenceRemoved: function (event, sequenceId) {
            delete $scope.settings[SETTINGS.BUILDING_SEQUENCES][sequenceId];

            const substituteSequence = selectSome($scope.settings[SETTINGS.BUILDING_SEQUENCES]);
            editorView.selectedSequence = {name: substituteSequence, value: substituteSequence};
            eventHandlers.updateSequences();
            editorView.generateBuildingSequence();

            if (settings.get(SETTINGS.ACTIVE_SEQUENCE) === sequenceId) {
                settings.set(SETTINGS.ACTIVE_SEQUENCE, substituteSequence, {
                    quiet: true
                });
                settingsView.generateSequences();
            }

            utils.notif('success', $filter('i18n')('sequence_removed', $rootScope.loc.ale, 'builder_queue', sequenceId));
        },
        saveSettings: function () {
            utils.notif('success', $filter('i18n')('settings_saved', $rootScope.loc.ale, 'builder_queue'));
        },
        started: function () {
            $scope.running = true;
        },
        stopped: function () {
            $scope.running = false;
        }
    };

    const init = function () {
        gameDataBuildings = modelDataService.getGameData().getBuildings();
        settingsView.generateBuildingsLevelPoints();
        settings = builderQueue.getSettings();

        $button = interfaceOverflow.addMenuButton('Builder', 30);
        $button.addEventListener('click', buildWindow);

        eventQueue.register(eventTypeProvider.BUILDER_QUEUE_START, function () {
            running = true;
            $button.classList.remove('btn-orange');
            $button.classList.add('btn-red');
            utils.notif('success', $filter('i18n')('started', $rootScope.loc.ale, 'builder_queue'));
        });

        eventQueue.register(eventTypeProvider.BUILDER_QUEUE_STOP, function () {
            running = false;
            $button.classList.remove('btn-red');
            $button.classList.add('btn-orange');
            utils.notif('success', $filter('i18n')('stopped', $rootScope.loc.ale, 'builder_queue'));
        });

        interfaceOverflow.addTemplate('twoverflow_builder_queue_window', `___builder_queue_html_main`);
        interfaceOverflow.addTemplate('twoverflow_builder_queue_add_building_modal', `___builder_queue_html_modal-add-building`);
        interfaceOverflow.addTemplate('twoverflow_builder_queue_name_sequence_modal', `___builder_queue_html_modal-name-sequence`);
        interfaceOverflow.addStyle('___builder_queue_css_style');
    };

    const buildWindow = function () {
        const activeSequence = settings.get(SETTINGS.ACTIVE_SEQUENCE);

        $scope = $rootScope.$new();
        $scope.selectedTab = TAB_TYPES.SETTINGS;
        $scope.TAB_TYPES = TAB_TYPES;
        $scope.SETTINGS = SETTINGS;
        $scope.running = running;
        $scope.pagination = {};
        $scope.settingsMap = settings.settingsMap;

        $scope.villagesLabel = villagesLabel;
        $scope.villagesInfo = villagesInfo;

        $scope.editorView = editorView;
        $scope.editorView.buildingSequence = {};
        $scope.editorView.visibleBuildingSequence = [];
        $scope.editorView.selectedSequence = {name: activeSequence, value: activeSequence};

        $scope.editorView.lastAddedBuilding = BUILDING_TYPES.HEADQUARTER;
        $scope.editorView.lastAddedIndex = 1;

        $scope.settingsView = settingsView;
        $scope.settingsView.buildingSequence = {};
        $scope.settingsView.buildingSequenceFinal = {};

        $scope.logsView = logsView;
        $scope.logsView.logs = builderQueue.getLogs();

        // methods
        $scope.selectTab = selectTab;
        $scope.switchBuilder = switchBuilder;
        $scope.saveSettings = saveSettings;
        $scope.createSequence = createSequence;
        $scope.openVillageInfo = windowDisplayService.openVillageInfo;

        settings.injectScope($scope);
        eventHandlers.updateGroups();
        eventHandlers.updateSequences();

        $scope.pagination.buildingSequence = {
            count: settingsView.buildingSequence.length,
            offset: 0,
            loader: settingsView.updateVisibleBuildingSequence,
            limit: storageService.getPaginationLimit()
        };

        $scope.pagination.buildingSequenceEditor = {
            count: editorView.buildingSequence.length,
            offset: 0,
            loader: editorView.updateVisibleBuildingSequence,
            limit: storageService.getPaginationLimit()
        };

        $scope.pagination.logs = {
            count: logsView.logs.length,
            offset: 0,
            loader: logsView.updateVisibleLogs,
            limit: storageService.getPaginationLimit()
        };

        logsView.updateVisibleLogs();

        settingsView.generateSequences();
        editorView.generateBuildingSequence();

        const eventScope = new EventScope('twoverflow_builder_queue_window');
        eventScope.register(eventTypeProvider.GROUPS_UPDATED, eventHandlers.updateGroups, true);
        eventScope.register(eventTypeProvider.GROUPS_CREATED, eventHandlers.updateGroups, true);
        eventScope.register(eventTypeProvider.GROUPS_DESTROYED, eventHandlers.updateGroups, true);
        eventScope.register(eventTypeProvider.VILLAGE_SELECTED_CHANGED, eventHandlers.generateBuildingSequences, true);
        eventScope.register(eventTypeProvider.BUILDING_UPGRADING, eventHandlers.generateBuildingSequences, true);
        eventScope.register(eventTypeProvider.BUILDING_LEVEL_CHANGED, eventHandlers.generateBuildingSequences, true);
        eventScope.register(eventTypeProvider.BUILDING_TEARING_DOWN, eventHandlers.generateBuildingSequences, true);
        eventScope.register(eventTypeProvider.VILLAGE_BUILDING_QUEUE_CHANGED, eventHandlers.generateBuildingSequences, true);
        eventScope.register(eventTypeProvider.BUILDER_QUEUE_JOB_STARTED, eventHandlers.updateLogs);
        eventScope.register(eventTypeProvider.BUILDER_QUEUE_CLEAR_LOGS, eventHandlers.clearLogs);
        eventScope.register(eventTypeProvider.BUILDER_QUEUE_BUILDING_SEQUENCES_UPDATED, eventHandlers.buildingSequenceUpdate);
        eventScope.register(eventTypeProvider.BUILDER_QUEUE_BUILDING_SEQUENCES_ADDED, eventHandlers.buildingSequenceAdd);
        eventScope.register(eventTypeProvider.BUILDER_QUEUE_BUILDING_SEQUENCES_REMOVED, eventHandlers.buildingSequenceRemoved);
        eventScope.register(eventTypeProvider.BUILDER_QUEUE_SETTINGS_CHANGE, eventHandlers.saveSettings);
        eventScope.register(eventTypeProvider.BUILDER_QUEUE_START, eventHandlers.started);
        eventScope.register(eventTypeProvider.BUILDER_QUEUE_STOP, eventHandlers.stopped);

        windowManagerService.getScreenWithInjectedScope('!twoverflow_builder_queue_window', $scope);

        oldCloseWindow = $scope.closeWindow;
        $scope.closeWindow = confirmCloseWindow;

        $scope.$watch('settings[SETTINGS.ACTIVE_SEQUENCE].value', function (newValue, oldValue) {
            if (newValue !== oldValue) {
                eventHandlers.generateBuildingSequences();
            }
        });

        $scope.$watch('editorView.selectedSequence.value', function (newValue, oldValue) {
            if (ignoreInputChange) {
                ignoreInputChange = false;
                return;
            }

            if (newValue !== oldValue) {
                if (unsavedChanges) {
                    confirmDiscardModal(function onDiscard () {
                        eventHandlers.generateBuildingSequencesEditor();
                        unsavedChanges = false;
                    }, function onCancel () {
                        $scope.editorView.selectedSequence = {name: oldValue, value: oldValue};
                        ignoreInputChange = true;
                    });
                } else {
                    eventHandlers.generateBuildingSequencesEditor();
                }
            }
        });
    };

    return init;
});
