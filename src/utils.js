define('two/utils', [
    'helper/time',
    'helper/math'
], function (
    $timeHelper,
    $math
) {
    const utils = {};

    /**
     * Gera um número aleatório aproximado da base.
     *
     * @param {Number} base - Número base para o calculo.
     */
    utils.randomSeconds = function (base) {
        if (!base) {
            return 0;
        }

        base = parseInt(base, 10);

        const max = base + (base / 2);
        const min = base - (base / 2);

        return Math.round(Math.random() * (max - min) + min);
    };

    /**
     * Converte uma string com um tempo em segundos.
     *
     * @param {String} time - Tempo que será convertido (hh:mm:ss)
     */
    utils.time2seconds = function (time) {
        time = time.split(':');
        time[0] = parseInt(time[0], 10) * 60 * 60;
        time[1] = parseInt(time[1], 10) * 60;
        time[2] = parseInt(time[2], 10);

        return time.reduce(function (a, b) {
            return a + b;
        });
    };

    /**
     * Emite notificação nativa do jogo.
     *
     * @param {String} type - success || error
     * @param {String} message - Texto a ser exibido
     */
    utils.notif = function (type, message) {
        $rootScope.$broadcast(eventTypeProvider.NOTIFICATION_DISABLE);
        $rootScope.$broadcast(eventTypeProvider.NOTIFICATION_ENABLE);

        const eventType = type === 'success'
            ? eventTypeProvider.MESSAGE_SUCCESS
            : eventTypeProvider.MESSAGE_ERROR;

        $rootScope.$broadcast(eventType, {
            message: message
        });
    };


    /**
     * Gera uma string com nome e coordenadas da aldeia
     *
     * @param {Object} village - Dados da aldeia
     * @return {String}
     */
    utils.genVillageLabel = function (village) {
        return village.name + ' (' + village.x + '|' + village.y + ')';
    };

    /**
     * Verifica se uma coordenada é válida.
     * 00|00
     * 000|00
     * 000|000
     * 00|000
     *
     * @param {String} xy - Coordenadas
     * @return {Boolean}
     */
    utils.isValidCoords = function (xy) {
        return /\s*\d{2,3}\|\d{2,3}\s*/.test(xy);
    };

    /**
     * Validação de horario e data de envio. Exmplo: 23:59:00:999 30/12/2016
     *
     * @param  {String}  dateTime
     * @return {Boolean}
     */
    utils.isValidDateTime = function (dateTime) {
        return /^\s*([01][0-9]|2[0-3]):[0-5]\d:[0-5]\d(:\d{1,3})? (0[1-9]|[12][0-9]|3[0-1])\/(0[1-9]|1[0-2])\/\d{4}\s*$/.test(dateTime);
    };

    /**
     * Inverte a posição do dia com o mês.
     */
    utils.fixDate = function (dateTime) {
        const dateAndTime = dateTime.trim().split(' ');
        const time = dateAndTime[0];
        const date = dateAndTime[1].split('/');

        return time + ' ' + date[1] + '/' + date[0] + '/' + date[2];
    };

    /**
     * Gera um id unico
     *
     * @return {String}
     */
    utils.guid = function () {
        return Math.floor((Math.random()) * 0x1000000).toString(16);
    };

    /**
     * Obtem o timestamp de uma data em string.
     * Formato da data: mês/dia/ano
     * Exmplo de entrada: 23:59:59:999 12/30/2017
     *
     * @param  {String} dateString - Data em formato de string.
     * @return {Number} Timestamp (milisegundos)
     */
    utils.getTimeFromString = function (dateString, offset) {
        const dateSplit = utils.fixDate(dateString).split(' ');
        const time = dateSplit[0].split(':');
        const date = dateSplit[1].split('/');

        const hour = time[0];
        const min = time[1];
        const sec = time[2];
        const ms = time[3] || null;

        const month = parseInt(date[0], 10) - 1;
        const day = date[1];
        const year = date[2];

        const _date = new Date(year, month, day, hour, min, sec, ms);

        return _date.getTime() + (offset || 0);
    };

    /**
     * Formata milisegundos em hora/data
     *
     * @return {String} Data e hora formatada
     */
    utils.formatDate = function (ms, format) {
        return $filter('readableDateFilter')(
            ms,
            null,
            $rootScope.GAME_TIMEZONE,
            $rootScope.GAME_TIME_OFFSET,
            format || 'HH:mm:ss dd/MM/yyyy'
        );
    };

    /**
     * Obtem a diferença entre o timezone local e do servidor.
     *
     * @type {Number}
     */
    utils.getTimeOffset = function () {
        const localDate = $timeHelper.gameDate();
        const localOffset = localDate.getTimezoneOffset() * 1000 * 60;
        const serverOffset = $rootScope.GAME_TIME_OFFSET;

        return localOffset + serverOffset;
    };

    utils.xhrGet = function (url, dataType = 'text') {
        return new Promise(function (resolve, reject) {
            if (!url) {
                return reject();
            }

            const xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.responseType = dataType;
            xhr.addEventListener('load', function () {
                resolve(xhr);
            }, false);

            xhr.send();
        });
    };

    utils.obj2selectOptions = function (obj, _includeIcon) {
        const list = [];

        for (const i in obj) {
            const item = {
                name: obj[i].name,
                value: obj[i].id
            };

            if (_includeIcon) {
                item.leftIcon = obj[i].icon;
            }

            list.push(item);
        }

        return list;
    };

    /**
     * @param {Object} origin - Objeto da aldeia origem.
     * @param {Object} target - Objeto da aldeia alvo.
     * @param {Object} units - Exercito usado no ataque como referência
     * para calcular o tempo.
     * @param {String} type - Tipo de comando (attack,support,relocate)
     * @param {Object} officers - Oficiais usados no comando (usados para efeitos)
     *
     * @return {Number} Tempo de viagem
     */
    utils.getTravelTime = function (origin, target, units, type, officers, useEffects) {
        const targetIsBarbarian = !target.character_id;
        const targetIsSameTribe = target.character_id && target.tribe_id &&
                target.tribe_id === modelDataService.getSelectedCharacter().getTribeId();

        if (useEffects !== false) {
            if (type === 'attack') {
                if ('supporter' in officers) {
                    delete officers.supporter;
                }

                if (targetIsBarbarian) {
                    useEffects = true;
                }
            } else if (type === 'support') {
                if (targetIsSameTribe) {
                    useEffects = true;
                }

                if ('supporter' in officers) {
                    useEffects = true;
                }
            }
        }

        const army = {
            units: units,
            officers: angular.copy(officers)
        };

        const travelTime = armyService.calculateTravelTime(army, {
            barbarian: targetIsBarbarian,
            ownTribe: targetIsSameTribe,
            officers: officers,
            effects: useEffects
        }, type);

        const distance = $math.actualDistance(origin, target);

        const totalTravelTime = armyService.getTravelTimeForDistance(
            army,
            travelTime,
            distance,
            type
        );

        return totalTravelTime * 1000;
    };

    utils.each = function (obj, iterator) {
        if (typeof iterator !== 'function') {
            iterator = noop;
        }

        if (Array.isArray(obj)) {
            for (let i = 0, l = obj.length; i < l; i++) {
                if (iterator(obj[i], i) === false) {
                    return false;
                }
            }
        } else if (angular.isObject(obj)) {
            for (const i in obj) {
                if (hasOwn.call(obj, i)) {
                    if (iterator(obj[i], i) === false) {
                        return false;
                    }
                }
            }
        }

        return true;
    };

    return utils;
});
