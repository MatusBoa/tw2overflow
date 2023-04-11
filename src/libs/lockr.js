/**
 * https://github.com/tsironis/lockr
 */
define('Lockr', function (root, Lockr) {
    const [, worldId, characterId] = location.search.match(/world=([a-z0-9]+).*character_id=(\d+)/);

    Lockr.prefix = `${characterId}_twOverflow_${worldId}-`;

    Lockr._getPrefixedKey = function (key, options) {
        options = options || {};

        if (options.noPrefix) {
            return key;
        } else {
            return this.prefix + key;
        }

    };

    Lockr.set = function (key, value, options) {
        const query_key = this._getPrefixedKey(key, options);

        try {
            localStorage.setItem(query_key, JSON.stringify({
                data: value
            }));
        } catch (e) {}
    };

    Lockr.get = function (key, missing, options) {
        const query_key = this._getPrefixedKey(key, options);
        let value;

        try {
            value = JSON.parse(localStorage.getItem(query_key));
        } catch (e) {
            if (localStorage[query_key]) {
                value = {
                    data: localStorage.getItem(query_key)
                };
            } else {
                value = null;
            }
        }
        
        if (value === null) {
            return missing;
        } else if (typeof value === 'object' && typeof value.data !== 'undefined') {
            return value.data;
        } else {
            return missing;
        }
    };

    return Lockr;
});
