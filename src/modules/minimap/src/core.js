define('two/minimap', [
    'two/minimap/types/actions',
    'two/minimap/types/mapSizes',
    'two/minimap/settings',
    'two/minimap/settings/map',
    'two/minimap/settings/updates',
    'two/utils',
    'two/ready',
    'two/Settings',
    'two/mapData',
    'queues/EventQueue',
    'Lockr',
    'struct/MapData',
    'helper/mapconvert',
    'cdn',
    'conf/colors',
    'conf/colorGroups',
    'conf/conf',
    'states/MapState'
], function (
    ACTION_TYPES,
    MAP_SIZE_TYPES,
    SETTINGS,
    SETTINGS_MAP,
    UPDATES,
    utils,
    ready,
    Settings,
    twoMapData,
    eventQueue,
    Lockr,
    mapData,
    mapconvert,
    cdn,
    colors,
    colorGroups,
    conf,
    mapState
) {
    let renderingEnabled = false;
    const highlights = {};
    let villageSize;
    const villageMargin = 1;
    let villageBlock;
    let lineSize;
    let blockOffset;
    let allVillages;
    const mappedData = {
        village: {},
        character: {},
        tribe: {}
    };
    const boundariesX = {a: 0, b: 0};
    const boundariesY = {a: 0, b: 0};
    const viewBoundariesX = {a: 0, b: 0};
    const viewBoundariesY = {a: 0, b: 0};
    let selectedVillage;
    const currentPosition = {};
    const currentCoords = {};
    const mappedVillages = {};
    let hoveredVillage = false;
    let hoveredVillageX;
    let hoveredVillageY;
    let $viewport;
    let viewportContext;
    let $viewportCache;
    let viewportCacheContext;
    let $viewportRef;
    let viewportRefContext;
    let $map;
    let $mapWrapper;
    let $player;
    let playerId;
    let playerTribeId;
    let villageColors;
    let tribeRelations;
    let settings;
    let minimapSettings;
    const STORAGE_KEYS = {
        CACHE_VILLAGES: 'minimap_cache_villages',
        SETTINGS: 'minimap_settings'
    };
    const MAP_SIZES = {
        [MAP_SIZE_TYPES.VERY_SMALL]: 2,
        [MAP_SIZE_TYPES.SMALL]: 3,
        [MAP_SIZE_TYPES.BIG]: 5,
        [MAP_SIZE_TYPES.VERY_BIG]: 7
    };
    const INTERFACE_HEIGHT = 265;
    const BORDER_PADDING = 10;
    const BORDER_COLOR = '#2B4700';
    const colorService = injector.get('colorService');
    const spriteFactory = injector.get('spriteFactory');
    
    let allowJump = true;
    let allowMove = false;
    let dragStart = {};
    let highlightSprite;
    let currentMouseCoords = {
        x: 0,
        y: 0
    };
    let firstDraw = true;
    const rhexcolor = /^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

    /**
     * Calcule the coords from clicked position in the canvas.
     *
     * @param {Object} event - Canvas click event.
     * @return {Object} X and Y coordinates.
     */
    const getCoords = function (event) {
        let rawX = Math.ceil(currentPosition.x + event.offsetX) - blockOffset;
        let rawY = Math.ceil(currentPosition.y + event.offsetY) + blockOffset;

        if (Math.floor((rawY / villageBlock)) % 2) {
            rawX += blockOffset;
        }

        rawX -= rawX % villageBlock;
        rawY -= rawY % villageBlock;

        return {
            x: Math.ceil((rawX - $viewport.width / 2) / villageBlock),
            y: Math.ceil((rawY - $viewport.height / 2) / villageBlock)
        };
    };

    /**
     * Convert pixel wide map position to coords
     *
     * @param {Number} x - X pixel position.
     * @param {Number} y - Y pixel position.
     * @return {Object} Y and Y coordinates.
     */
    const pixel2Tiles = function (x, y) {
        return {
            x: (x / conf.TILESIZE.x),
            y: (y / conf.TILESIZE.y / conf.TILESIZE.off)
        };
    };

    /**
     * Calculate the coords based on zoom.
     *
     * @param {Array[x, y, canvasW, canvasH]} rect - Coords and canvas size.
     * @param {Number} zoom - Current zoom used to display the game original map.
     * @return {Array} Calculated coords.
     */
    const convert = function (rect, zoom) {
        zoom = 1 / (zoom || 1);

        const xy = pixel2Tiles(rect[0] * zoom, rect[1] * zoom);
        const wh = pixel2Tiles(rect[2] * zoom, rect[3] * zoom);
        
        return [
            xy.x - 1,
            xy.y - 1,
            (wh.x + 3) || 1,
            (wh.y + 3) || 1
        ];
    };

    const drawBorders = function () {
        const binUrl = cdn.getPath(conf.getMapPath());
        const continentEnabled = minimapSettings[SETTINGS.SHOW_CONTINENT_DEMARCATIONS];
        const provinceEnabled = minimapSettings[SETTINGS.SHOW_PROVINCE_DEMARCATIONS];

        const drawContinent = function (x, y) {
            viewportCacheContext.fillStyle = minimapSettings[SETTINGS.COLOR_CONTINENT];
            viewportCacheContext.fillRect(x * villageBlock + blockOffset - 1, y * villageBlock + blockOffset - 1, 3, 1);
            viewportCacheContext.fillRect(x * villageBlock + blockOffset, y * villageBlock + blockOffset - 2, 1, 3);
        };

        const drawProvince = function (x, y) {
            viewportCacheContext.fillStyle = minimapSettings[SETTINGS.COLOR_PROVINCE];
            viewportCacheContext.fillRect(x * villageBlock + blockOffset, y * villageBlock + blockOffset - 1, 1, 1);
        };

        utils.xhrGet(binUrl, 'arraybuffer').then(function (xhr) {
            const dataView = new DataView(xhr.response);
            const paddedBoundariesX = {
                a: boundariesX.a - BORDER_PADDING,
                b: boundariesX.b + BORDER_PADDING
            };
            const paddedBoundariesY = {
                a: boundariesY.a - BORDER_PADDING,
                b: boundariesY.b + BORDER_PADDING
            };

            if (continentEnabled || provinceEnabled) {
                for (let x = paddedBoundariesX.a; x < paddedBoundariesX.b; x++) {
                    for (let y = paddedBoundariesY.a; y < paddedBoundariesY.b; y++) {
                        const tile = mapconvert.toTile(dataView, x, y);

                        // is border
                        if (tile.key.b) {
                            // is continental border
                            if (tile.key.c) {
                                if (continentEnabled) {
                                    drawContinent(x, y);
                                } else if (provinceEnabled) {
                                    drawProvince(x, y);
                                }
                            } else if (provinceEnabled) {
                                drawProvince(x, y);
                            }
                        }
                    }
                }
            }

            const borderX = paddedBoundariesX.a * villageBlock;
            const borderY = paddedBoundariesY.a * villageBlock;
            const borderWidth = (paddedBoundariesX.b - paddedBoundariesX.a) * villageBlock;
            const borderHeight = (paddedBoundariesY.b - paddedBoundariesY.a) * villageBlock;

            viewportCacheContext.beginPath();
            viewportCacheContext.lineWidth = 2;
            viewportCacheContext.strokeStyle = BORDER_COLOR;
            viewportCacheContext.rect(borderX, borderY, borderWidth, borderHeight);
            viewportCacheContext.stroke();
        });
    };

    const drawLoadedVillages = function () {
        drawVillages(allVillages);
    };

    /**
     * @param {Object} pos - Minimap current position plus center of canvas.
     */
    const drawViewport = function (pos) {
        viewportContext.drawImage($viewportCache, -pos.x, -pos.y);
    };

    const clearViewport = function () {
        viewportContext.clearRect(0, 0, $viewport.width, $viewport.height);
    };

    /**
     * @param {Object} pos - Minimap current position plus center of canvas.
     */
    const drawViewReference = function (pos) {
        const mapPosition = minimap.getMapPosition();
        const x = ((mapPosition.x - 2) * villageBlock) - pos.x;
        const y = ((mapPosition.y - 2) * villageBlock) - pos.y;

        // cross
        viewportRefContext.fillStyle = minimapSettings[SETTINGS.COLOR_VIEW_REFERENCE];
        viewportRefContext.fillRect(x, 0, 1, lineSize);
        viewportRefContext.fillRect(0, y, lineSize, 1);

        const mapRect = $mapWrapper.getBoundingClientRect();
        const refRectWidth = (mapRect.width / conf.TILESIZE.x / mapState.view.z) * villageBlock;
        const refRectHeight = (mapRect.height / conf.TILESIZE.y / mapState.view.z) * villageBlock;
        const refRectX = x - (refRectWidth / 2);
        const refRectY = y - (refRectHeight / 2);

        // view rect
        viewportRefContext.clearRect(refRectX, refRectY, refRectWidth, refRectHeight);
        viewportRefContext.beginPath();
        viewportRefContext.lineWidth = 1;
        viewportRefContext.strokeStyle = minimapSettings[SETTINGS.COLOR_VIEW_REFERENCE];
        viewportRefContext.rect(refRectX, refRectY, refRectWidth, refRectHeight);
        viewportRefContext.stroke();
    };

    const clearCross = function () {
        viewportRefContext.clearRect(0, 0, $viewportRef.width, $viewportRef.height);
    };

    const renderStep = function () {
        if (renderingEnabled) {
            const pos = {
                x: currentPosition.x - ($viewport.width / 2),
                y: currentPosition.y - ($viewport.height / 2)
            };

            clearViewport();
            clearCross();
            drawViewport(pos);

            if (minimapSettings[SETTINGS.SHOW_VIEW_REFERENCE]) {
                drawViewReference(pos);
            }
        }

        window.requestAnimationFrame(renderStep);
    };

    const cacheVillages = function (villages) {
        for (let i = 0, l = villages.length; i < l; i++) {
            const v = villages[i];

            // meta village
            if (v.id < 0) {
                continue;
            }

            if (!(v.x in mappedData.village)) {
                mappedData.village[v.x] = {};
            }

            if (!(v.x in mappedVillages)) {
                mappedVillages[v.x] = [];
            }

            mappedData.village[v.x][v.y] = v.character_id || 0;
            mappedVillages[v.x][v.y] = v;

            if (v.character_id) {
                if (v.character_id in mappedData.character) {
                    mappedData.character[v.character_id].push([v.x, v.y]);
                } else {
                    mappedData.character[v.character_id] = [[v.x, v.y]];
                }

                if (v.tribe_id) {
                    if (v.tribe_id in mappedData.tribe) {
                        mappedData.tribe[v.tribe_id].push(v.character_id);
                    } else {
                        mappedData.tribe[v.tribe_id] = [v.character_id];
                    }
                }
            }
        }
    };

    const setBoundaries = function () {
        const allX = [];
        const allY = [];

        for (const x in mappedData.village) {
            allX.push(x);

            for (const y in mappedData.village[x]) {
                allY.push(y);
            }
        }

        boundariesX.a = Math.min(...allX);
        boundariesX.b = Math.max(...allX);
        boundariesY.a = Math.min(...allY);
        boundariesY.b = Math.max(...allY);

        viewBoundariesX.a = boundariesX.a * villageBlock;
        viewBoundariesX.b = boundariesX.b * villageBlock;
        viewBoundariesY.a = boundariesY.a * villageBlock;
        viewBoundariesY.b = boundariesY.b * villageBlock;
    };

    const onHoverVillage = function (coords, event) {
        if (hoveredVillage) {
            if (hoveredVillageX === coords.x && hoveredVillageY === coords.y) {
                return false;
            } else {
                onBlurVillage();
            }
        }

        hoveredVillage = true;
        hoveredVillageX = coords.x;
        hoveredVillageY = coords.y;

        eventQueue.trigger(eventTypeProvider.MINIMAP_VILLAGE_HOVER, {
            x: hoveredVillageX,
            y: hoveredVillageY,
            event: event
        });

        const pid = mappedData.village[hoveredVillageX][hoveredVillageY];

        if (pid) {
            highlightVillages(mappedData.character[pid]);
        } else {
            highlightVillages([[hoveredVillageX, hoveredVillageY]]);
        }
    };

    const onBlurVillage = function () {
        if (!hoveredVillage) {
            return false;
        }

        const pid = mappedData.village[hoveredVillageX][hoveredVillageY];

        if (pid) {
            unhighlightVillages(mappedData.character[pid]);
        } else {
            unhighlightVillages([[hoveredVillageX, hoveredVillageY]]);
        }

        hoveredVillage = false;
        eventQueue.trigger(eventTypeProvider.MINIMAP_VILLAGE_BLUR, {
            x: hoveredVillageX,
            y: hoveredVillageY
        });
    };

    const highlightVillages = function (villages) {
        const villagesData = [];

        for (let i = 0; i < villages.length; i++) {
            const x = villages[i][0];
            const y = villages[i][1];

            villagesData.push(mappedVillages[x][y]);
        }

        drawVillages(villagesData, minimapSettings[SETTINGS.COLOR_QUICK_HIGHLIGHT]);
    };

    const unhighlightVillages = function (villages) {
        const villagesData = [];

        for (let i = 0; i < villages.length; i++) {
            const x = villages[i][0];
            const y = villages[i][1];

            villagesData.push(mappedVillages[x][y]);
        }

        drawVillages(villagesData);
    };

    const showHighlightSprite = function (x, y) {
        const pos = mapService.tileCoordinate2Pixel(x, y);
        highlightSprite.setTranslation(pos[0] - 25, pos[1] + 2);
        highlightSprite.alpha = 1;
    };

    const hideHighlightSprite = function () {
        highlightSprite.alpha = 0;
    };

    const quickHighlight = function (x, y) {
        mapData.getTownAtAsync(x, y, function (village) {
            if (!village) {
                return false;
            }

            switch (minimapSettings[SETTINGS.RIGHT_CLICK_ACTION]) {
                case ACTION_TYPES.HIGHLIGHT_PLAYER: {
                    if (!village.character_id) {
                        return false;
                    }

                    minimap.addHighlight({
                        type: 'character',
                        id: village.character_id
                    }, colors.palette.flat().random());

                    break;
                }
                case ACTION_TYPES.HIGHLIGHT_TRIBE: {
                    if (!village.tribe_id) {
                        return false;
                    }

                    minimap.addHighlight({
                        type: 'tribe',
                        id: village.tribe_id
                    }, colors.palette.flat().random());

                    break;
                }
            }
        });
    };

    const getVillageColor = function (village) {
        if (minimapSettings[SETTINGS.SHOW_ONLY_CUSTOM_HIGHLIGHTS]) {
            if (village.character_id in highlights.character) {
                return highlights.character[village.character_id];
            } else if (village.tribe_id in highlights.tribe) {
                return highlights.tribe[village.tribe_id];
            }

            return false;
        }

        if (!village.character_id) {
            if (minimapSettings[SETTINGS.SHOW_BARBARIANS]) {
                return villageColors.barbarian;
            }

            return false;
        }

        if (village.character_id === playerId) {
            if (village.id === selectedVillage.getId() && minimapSettings[SETTINGS.HIGHLIGHT_SELECTED]) {
                return villageColors.selected;
            } else if (village.character_id in highlights.character) {
                return highlights.character[village.character_id];
            } else if (minimapSettings[SETTINGS.HIGHLIGHT_OWN]) {
                return villageColors.player;
            }
        } else if (village.character_id in highlights.character) {
            return highlights.character[village.character_id];
        } else if (village.tribe_id in highlights.tribe) {
            return highlights.tribe[village.tribe_id];
        } else if (playerTribeId && playerTribeId === village.tribe_id && minimapSettings[SETTINGS.HIGHLIGHT_DIPLOMACY]) {
            return villageColors.tribe;
        } else if (tribeRelations && minimapSettings[SETTINGS.HIGHLIGHT_DIPLOMACY]) {
            if (tribeRelations.isAlly(village.tribe_id)) {
                return villageColors.ally;
            } else if (tribeRelations.isEnemy(village.tribe_id)) {
                return villageColors.enemy;
            } else if (tribeRelations.isNAP(village.tribe_id)) {
                return villageColors.friendly;
            }
        }

        return villageColors.ugly;
    };

    const drawVillages = function (villages, predefinedColor) {
        for (let i = 0; i < villages.length; i++) {
            const village = villages[i];

            // meta village
            if (village.id < 0) {
                continue;
            }

            const color = predefinedColor || getVillageColor(village);

            if (!color) {
                continue;
            }

            const x = village.x * villageBlock + (village.y % 2 ? blockOffset : 0);
            const y = village.y * villageBlock;

            viewportCacheContext.fillStyle = color;
            viewportCacheContext.fillRect(x, y, villageSize, villageSize);
        }
    };

    const updateMinimapValues = function () {
        villageSize = MAP_SIZES[minimapSettings[SETTINGS.MAP_SIZE]];
        blockOffset = Math.round(villageSize / 2);
        villageBlock = villageSize + villageMargin;
        lineSize = villageBlock * 1000;
        
        viewBoundariesX.a = boundariesX.a * villageBlock;
        viewBoundariesX.b = boundariesX.b * villageBlock;
        viewBoundariesY.a = boundariesY.a * villageBlock;
        viewBoundariesY.b = boundariesY.b * villageBlock;

        $viewportCache.width = 1000 * villageBlock;
        $viewportCache.height = 1000 * villageBlock;
        viewportCacheContext.imageSmoothingEnabled = false;
    };

    const setViewportSize = function () {
        const WIDTH = 686;
        const HEIGHT = document.body.clientHeight - INTERFACE_HEIGHT;

        $viewport.width = WIDTH;
        $viewport.height = HEIGHT;
        $viewportRef.width = WIDTH;
        $viewportRef.height = HEIGHT;

        viewportContext.imageSmoothingEnabled = false;
        viewportRefContext.imageSmoothingEnabled = false;
    };

    const eventHandlers = {
        onViewportRefMouseDown: function (event) {
            event.preventDefault();

            allowJump = true;
            allowMove = true;
            dragStart.x = currentPosition.x + event.pageX;
            dragStart.y = currentPosition.y + event.pageY;

            if (hoveredVillage) {
                eventQueue.trigger(eventTypeProvider.MINIMAP_VILLAGE_CLICK, [
                    hoveredVillageX,
                    hoveredVillageY,
                    event
                ]);

                // right click
                if (event.which === 3) {
                    quickHighlight(hoveredVillageX, hoveredVillageY);
                }
            }

            eventQueue.trigger(eventTypeProvider.MINIMAP_START_MOVE);
        },
        onViewportRefMouseUp: function () {
            allowMove = false;
            dragStart = {};

            if (!allowJump) {
                eventQueue.trigger(eventTypeProvider.MINIMAP_STOP_MOVE);
            }
        },
        onViewportRefMouseMove: function (event) {
            allowJump = false;
            currentMouseCoords = getCoords(event);

            if (allowMove) {
                currentPosition.x = (dragStart.x - event.pageX).bound(viewBoundariesX.a, viewBoundariesX.b);
                currentPosition.y = (dragStart.y - event.pageY).bound(viewBoundariesY.a, viewBoundariesY.b);
                currentCoords.x = currentMouseCoords.x;
                currentCoords.y = currentMouseCoords.y;
                return false;
            }

            if (currentCoords.x !== currentMouseCoords.x || currentCoords.y !== currentMouseCoords.y) {
                hideHighlightSprite();
                showHighlightSprite(currentMouseCoords.x, currentMouseCoords.y);
            }

            if (currentMouseCoords.x in mappedVillages && currentMouseCoords.y in mappedVillages[currentMouseCoords.x]) {
                const village = mappedVillages[currentMouseCoords.x][currentMouseCoords.y];

                // ignore barbarian villages
                if (!minimapSettings[SETTINGS.SHOW_BARBARIANS] && !village.character_id) {
                    return false;
                }

                // check if the village is custom highlighted
                if (minimapSettings[SETTINGS.SHOW_ONLY_CUSTOM_HIGHLIGHTS]) {
                    let highlighted = false;

                    if (village.character_id in highlights.character) {
                        highlighted = true;
                    } else if (village.tribe_id in highlights.tribe) {
                        highlighted = true;
                    }

                    if (!highlighted) {
                        return false;
                    }
                }

                return onHoverVillage(currentMouseCoords, event);
            }

            onBlurVillage();
        },
        onViewportRefMouseLeave: function () {
            if (hoveredVillage) {
                onBlurVillage();
            }

            eventQueue.trigger(eventTypeProvider.MINIMAP_MOUSE_LEAVE);
        },
        onViewportRefMouseClick: function (event) {
            if (!allowJump) {
                return false;
            }

            const coords = getCoords(event);
            mapService.jumpToVillage(coords.x, coords.y);
        },
        onViewportRefMouseContext: function (event) {
            event.preventDefault();
            return false;
        },
        onHighlightChange: function () {
            highlights.tribe = colorService.getCustomColorsByGroup(colorGroups.TRIBE_COLORS) || {};
            highlights.character = colorService.getCustomColorsByGroup(colorGroups.PLAYER_COLORS) || {};

            drawLoadedVillages();
        },
        onSelectedVillageChange: function () {
            const old = {
                id: selectedVillage.getId(),
                x: selectedVillage.getX(),
                y: selectedVillage.getY()
            };

            selectedVillage = $player.getSelectedVillage();

            drawVillages([{
                character_id: $player.getId(),
                id: old.id,
                x: old.x,
                y: old.y
            }, {
                character_id: $player.getId(),
                id: selectedVillage.getId(),
                x: selectedVillage.getX(),
                y: selectedVillage.getY()
            }]);
        }
    };

    const minimap = {};

    /**
     * @param {Object} item - Highlight item.
     * @param {String} item.type - player or tribe
     * @param {String} item.id - player/tribe id
     * @param {String} color - Hex color
     *
     * @return {Boolean} true if successfully added
     */
    minimap.addHighlight = function (item, color) {
        if (!item || !item.type || !item.id || !hasOwn.call(highlights, item.type)) {
            eventQueue.trigger(eventTypeProvider.MINIMAP_HIGHLIGHT_ADD_ERROR_NO_ENTRY);
            return false;
        }

        if (!rhexcolor.test(color)) {
            eventQueue.trigger(eventTypeProvider.MINIMAP_HIGHLIGHT_ADD_ERROR_INVALID_COLOR);
            return false;
        }

        highlights[item.type][item.id] = color[0] !== '#' ? '#' + color : color;
        const colorGroup = item.type === 'character' ? colorGroups.PLAYER_COLORS : colorGroups.TRIBE_COLORS;
        colorService.setCustomColorsByGroup(colorGroup, highlights[item.type]);
        $rootScope.$broadcast(eventTypeProvider.GROUPS_VILLAGES_CHANGED);

        drawLoadedVillages();

        return true;
    };

    minimap.removeHighlight = function (type, itemId) {
        if (typeof itemId === 'undefined' || !hasOwn.call(highlights, type)) {
            return false;
        }

        if (!hasOwn.call(highlights[type], itemId)) {
            return false;
        }

        delete highlights[type][itemId];
        const colorGroup = type === 'character' ? colorGroups.PLAYER_COLORS : colorGroups.TRIBE_COLORS;
        colorService.setCustomColorsByGroup(colorGroup, highlights[type]);
        $rootScope.$broadcast(eventTypeProvider.GROUPS_VILLAGES_CHANGED);
        drawLoadedVillages();

        return true;
    };

    minimap.getHighlight = function (type, item) {
        if (hasOwn.call(highlights[type], item)) {
            return highlights[type][item];
        } else {
            return false;
        }
    };

    minimap.getHighlights = function () {
        return highlights;
    };

    minimap.eachHighlight = function (callback) {
        for (const type in highlights) {
            for (const id in highlights[type]) {
                callback(type, id, highlights[type][id]);
            }
        }
    };

    minimap.setViewport = function (element) {
        $viewport = element;
        $viewport.style.background = minimapSettings[SETTINGS.COLOR_BACKGROUND];
        viewportContext = $viewport.getContext('2d');
    };

    minimap.setViewportRef = function (element) {
        $viewportRef = element;
        viewportRefContext = $viewportRef.getContext('2d');
    };

    minimap.setCurrentPosition = function (x, y) {
        currentPosition.x = (x * villageBlock);
        currentPosition.y = (y * villageBlock);
        currentCoords.x = Math.ceil(x);
        currentCoords.y = Math.ceil(y);
    };

    /**
     * @return {Array}
     */
    minimap.getMapPosition = function () {
        if (!$map.width || !$map.height) {
            return false;
        }

        const view = mapData.getMap().engine.getView();
        const converted = convert([
            -view.x,
            -view.y,
            $map.width / 2,
            $map.height / 2
        ], view.z);

        return {
            x: converted[0] + converted[2],
            y: converted[1] + converted[3]
        };
    };

    minimap.getSettings = function () {
        return settings;
    };

    minimap.drawMinimap = function () {
        if (firstDraw) {
            firstDraw = false;
        }

        $viewport.style.background = minimapSettings[SETTINGS.COLOR_BACKGROUND];
        viewportCacheContext.clearRect(0, 0, $viewportCache.width, $viewportCache.height);

        ready(function () {
            drawBorders();
            drawLoadedVillages();
        }, 'minimap_data');
    };

    minimap.enableRendering = function enableRendering () {
        renderingEnabled = true;
    };

    minimap.disableRendering = function disableRendering () {
        renderingEnabled = false;
    };

    minimap.isFirstDraw = function () {
        return !!firstDraw;
    };

    minimap.init = function () {
        minimap.initialized = true;
        $viewportCache = document.createElement('canvas');
        viewportCacheContext = $viewportCache.getContext('2d');
        highlightSprite = spriteFactory.make('hover');
        
        settings = new Settings({
            settingsMap: SETTINGS_MAP,
            storageKey: STORAGE_KEYS.SETTINGS
        });

        settings.onChange(function (changes, updates) {
            minimapSettings = settings.getAll();
            updateMinimapValues();

            if (updates[UPDATES.MAP_POSITION]) {
                minimap.setCurrentPosition(currentCoords.x, currentCoords.y);
            }

            if (updates[UPDATES.MINIMAP]) {
                minimap.drawMinimap();
            }
        });

        minimapSettings = settings.getAll();
        highlights.tribe = colorService.getCustomColorsByGroup(colorGroups.TRIBE_COLORS) || {};
        highlights.character = colorService.getCustomColorsByGroup(colorGroups.PLAYER_COLORS) || {};
        updateMinimapValues();
    };

    minimap.run = function () {
        ready(function () {
            $mapWrapper = document.getElementById('map');
            $map = document.getElementById('main-canvas');
            $player = modelDataService.getSelectedCharacter();
            tribeRelations = $player.getTribeRelations();
            playerId = $player.getId();
            playerTribeId = $player.getTribeId();
            villageColors = $player.getVillagesColors();

            highlightSprite.alpha = 0;
            mapState.graph.layers.effects.push(highlightSprite);

            setViewportSize();

            selectedVillage = $player.getSelectedVillage();
            currentCoords.x = selectedVillage.getX();
            currentCoords.y = selectedVillage.getY();
            currentPosition.x = selectedVillage.getX() * villageBlock;
            currentPosition.y = selectedVillage.getY() * villageBlock;

            window.addEventListener('resize', setViewportSize, false);
            $viewportRef.addEventListener('mousedown', eventHandlers.onViewportRefMouseDown);
            $viewportRef.addEventListener('mouseup', eventHandlers.onViewportRefMouseUp);
            $viewportRef.addEventListener('mousemove', eventHandlers.onViewportRefMouseMove);
            $viewportRef.addEventListener('mouseleave', eventHandlers.onViewportRefMouseLeave);
            $viewportRef.addEventListener('click', eventHandlers.onViewportRefMouseClick);
            $viewportRef.addEventListener('contextmenu', eventHandlers.onViewportRefMouseContext);

            twoMapData.load(function () {
                allVillages = twoMapData.getVillages();
                cacheVillages(allVillages);
                setBoundaries();
                renderStep();

                $rootScope.$on(eventTypeProvider.VILLAGE_SELECTED_CHANGED, eventHandlers.onSelectedVillageChange);
                $rootScope.$on(eventTypeProvider.TRIBE_RELATION_CHANGED, drawLoadedVillages);
                $rootScope.$on(eventTypeProvider.GROUPS_VILLAGES_CHANGED, eventHandlers.onHighlightChange);
            });
        }, ['initial_village', 'tribe_relations']);
    };

    return minimap;
});
