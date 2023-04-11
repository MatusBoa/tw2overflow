define('two/ready', [
    'conf/gameStates',
    'two/mapData'
], function (
    GAME_STATES,
    twoMapData
) {
    const queueRequests = {};

    const ready = function (callback, which) {
        which = which || ['map'];

        if (typeof which === 'string') {
            which = [which];
        }

        const readyStep = function (item) {
            which = which.filter(function (_item) {
                return _item !== item;
            });

            if (!which.length) {
                callback();
            }
        };

        const handlers = {
            'map': function () {
                const mapScope = transferredSharedDataService.getSharedData('MapController');

                if (mapScope.isInitialized) {
                    return readyStep('map');
                }

                $rootScope.$on(eventTypeProvider.MAP_INITIALIZED, function () {
                    readyStep('map');
                });
            },
            'tribe_relations': function () {
                const $player = modelDataService.getSelectedCharacter();

                if ($player) {
                    const $tribeRelations = $player.getTribeRelations();

                    if (!$player.getTribeId() || $tribeRelations) {
                        return readyStep('tribe_relations');
                    }
                }

                const unbind = $rootScope.$on(eventTypeProvider.TRIBE_RELATION_LIST, function () {
                    unbind();
                    readyStep('tribe_relations');
                });
            },
            'initial_village': function () {
                const $gameState = modelDataService.getGameState();

                if ($gameState.getGameState(GAME_STATES.INITIAL_VILLAGE_READY)) {
                    return readyStep('initial_village');
                }

                $rootScope.$on(eventTypeProvider.GAME_STATE_INITIAL_VILLAGE_READY, function () {
                    readyStep('initial_village');
                });
            },
            'all_villages_ready': function () {
                const $gameState = modelDataService.getGameState();

                if ($gameState.getGameState(GAME_STATES.ALL_VILLAGES_READY)) {
                    return readyStep('all_villages_ready');
                }

                $rootScope.$on(eventTypeProvider.GAME_STATE_ALL_VILLAGES_READY, function () {
                    readyStep('all_villages_ready');
                });
            },
            'minimap_data': function () {
                if (twoMapData.isLoaded()) {
                    return readyStep('minimap_data');
                }

                twoMapData.load(function () {
                    readyStep('minimap_data');
                });
            },
            'presets': function () {
                if (modelDataService.getPresetList().isLoaded()) {
                    return readyStep('presets');
                }

                queueRequests.presets = queueRequests.presets || new Promise(function (resolve) {
                    socketService.emit(routeProvider.GET_PRESETS, {}, resolve);
                });

                queueRequests.presets.then(function () {
                    readyStep('presets');
                });
            },
            'world_config': function () {
                if (modelDataService.getWorldConfig && modelDataService.getWorldConfig()) {
                    return readyStep('world_config');
                }

                setTimeout(handlers['world_config'], 100);
            }
        };

        const mapScope = transferredSharedDataService.getSharedData('MapController');

        if (!mapScope) {
            return setTimeout(function () {
                ready(callback, which);
            }, 100);
        }

        which.forEach(function (readyItem) {
            handlers[readyItem]();
        });
    };

    return ready;
});
