define('two/debug', [
    'Lockr'
], function (Lockr) {
    const STORAGE_KEY_DEBUG_LOGS = 'tw2overflow_debug';
    const STORAGE_KEY_DEBUG_LEVEL = 'tw2overflow_debug_level';
    const DEBUG_LEVEL = Lockr.get(STORAGE_KEY_DEBUG_LEVEL, 0);
    const DEBUG_LIMIT_ITEMS = 500;
    const DEBUG_LIMIT_MB = 3;


    if (!DEBUG_LEVEL) {
        Lockr.set(STORAGE_KEY_DEBUG_LOGS, []);
    }

    let logs = Lockr.get(STORAGE_KEY_DEBUG_LOGS, []);
    const colors = ['#54AC00', '#0067AC', '#AC0091', '#00AC1F', '#549300', '#CA6900', '#CA2400', '#CA0034', '#CA0093', '#0021AC'];
    let colorIndex = 0;

    window.addEventListener('beforeunload', function () {
        if (DEBUG_LEVEL) {
            Lockr.set(STORAGE_KEY_DEBUG_LOGS, logs.slice(-DEBUG_LIMIT_ITEMS));
        }
    });

    function checkStorageSize () {
        const textEncoder = new TextEncoder();
        const encodedLogs = textEncoder.encode(JSON.stringify(logs));
        const mb = encodedLogs.length / 1024 / 1024;

        if (mb > DEBUG_LIMIT_MB) {
            logs = logs.slice(-(DEBUG_LIMIT_ITEMS / 2));
            Lockr.set(STORAGE_KEY_DEBUG_LOGS, logs);
        }
    }

    function sprintf () {
        let index = 0;
        const args = Array.from(arguments);
        const string = args.shift();

        return string.replace(/%(s|d|i|o|O)/g, function (type) {
            switch (type) {
                case '%s':
                case '%i':
                case '%d': {
                    return args[index++];
                }
                case '%O':
                case '%o': {
                    return JSON.stringify(args[index++]);
                }
            }
        });
    }

    checkStorageSize();

    const debug = function (id) {
        if (typeof id !== 'string') {
            throw new Error('TW2Overflow debug id is not a string!');
        }

        const color = 'color:' + (colors[++colorIndex] || colors[colorIndex = 0]);

        return function () {
            if (!DEBUG_LEVEL) {
                return;
            }

            if (logs.length >= DEBUG_LIMIT_ITEMS) {
                logs.shift();
            }

            const args = Array.from(arguments);
            const level = args.shift();

            if (level > DEBUG_LEVEL) {
                return;
            }

            const raw = [...args];
            args[0] = '%c' + id + ': ' + args[0];
            args.splice(1, 0, color);
            console.log.apply(null, args);
            logs.push([Date.now(), sprintf.apply(null, raw)]);
        };
    };

    return debug;
});
