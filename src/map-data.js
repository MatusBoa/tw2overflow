define('two/mapData', [
    'conf/conf'
], function (
    conf
) {
    let villages = [];
    const grid = [];
    let loading = false;
    let loaded = false;
    let callbackQueue = [];
    const MINIMAP_WIDTH = 306;
    const MINIMAP_HEIGHT = 306;

    angular.extend(eventTypeProvider, {
        MAP_DATA_LOADED: 'map_data_loaded'
    });

    const init = function () {
        const xChunks = Math.ceil(conf.MAP_SIZE / MINIMAP_WIDTH);
        const yChunks = Math.ceil(conf.MAP_SIZE / MINIMAP_HEIGHT);

        for (let gridX = 0; gridX < xChunks; gridX++) {
            grid.push([]);

            let chunkX = MINIMAP_WIDTH * gridX;
            const chunkWidth = MINIMAP_WIDTH.bound(0, chunkX + MINIMAP_WIDTH).bound(0, conf.MAP_SIZE - chunkX);
            chunkX = chunkX.bound(0, conf.MAP_SIZE);

            for (let gridY = 0; gridY < yChunks; gridY++) {
                let chunkY = MINIMAP_HEIGHT * gridY;
                const chunkHeight = MINIMAP_HEIGHT.bound(0, chunkY + MINIMAP_HEIGHT).bound(0, conf.MAP_SIZE - chunkY);
                chunkY = chunkY.bound(0, conf.MAP_SIZE);

                grid[gridX].push({
                    x: chunkX,
                    y: chunkY,
                    width: chunkWidth,
                    height: chunkHeight
                });
            }
        }
    };

    const twoMapData = {};

    twoMapData.load = function (callback = noop, force) {
        if (force) {
            loaded = false;
        } else if (loading) {
            return callbackQueue.push(callback);
        } else if (loaded) {
            return callback(villages);
        }

        callbackQueue.push(callback);
        loading = true;
        const cells = [];

        for (let gridX = 0; gridX < grid.length; gridX++) {
            for (let gridY = 0; gridY < grid[gridX].length; gridY++) {
                cells.push(grid[gridX][gridY]);
            }
        }

        const requests = [];

        cells.forEach(function (cell) {
            const promise = new Promise(function (resolve, reject) {
                socketService.emit(routeProvider.MAP_GET_MINIMAP_VILLAGES, cell, function (data) {
                    if (data.message) {
                        return reject(data.message);
                    }

                    if (data.villages.length) {
                        villages = villages.concat(data.villages);
                    }

                    resolve();
                });
            });

            requests.push(promise);
        });

        return Promise.all(requests).then(function () {
            loading = false;
            loaded = true;

            $rootScope.$broadcast(eventTypeProvider.MAP_DATA_LOADED);
            
            callbackQueue.forEach(function (queuedCallback) {
                queuedCallback(villages);
            });

            callbackQueue = [];
        }).catch(function (error) {
            // eslint-disable-next-line no-console
            console.error(error.message);
        });
    };

    twoMapData.getVillages = function () {
        return villages;
    };

    twoMapData.isLoaded = function () {
        return loaded;
    };

    init();

    return twoMapData;
});
