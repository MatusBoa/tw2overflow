/**
 * https://github.com/tsironis/lockr
 */
define('Lockr', function (utils, root, Lockr) {
    const [, worldId, characterId] = location.search.match(/world=([a-z0-9]+).*character_id=(\d+)/);

    const toBase64 = function (origin) {
        return window.btoa(encodeURIComponent(origin))
    }

    const fromBase64 = function (origin) {
        return decodeURIComponent(window.atob(origin))
    }

    Lockr.prefix = `google_ads_n0_${toBase64(characterId + worldId)}/`;

    Lockr._getPrefixedKey = function (key, options) {
        options = options || {};

        if (options.noPrefix) {
            return toBase64(key);
        } else {
            return this.prefix + toBase64(key);
        }

    };

    Lockr.set = function (key, value, options) {
        const query_key = this._getPrefixedKey(key, options);

        try {
            localStorage.setItem(query_key, toBase64(
                JSON.stringify({
                    data: value
                })
            ));
        } catch (e) {}
    };

    Lockr.get = function (key, missing, options) {
        const query_key = this._getPrefixedKey(key, options);
        let value;

        try {
            value = JSON.parse(fromBase64(localStorage.getItem(query_key)));
        } catch (e) {
            if (localStorage[query_key]) {
                value = {
                    data: fromBase64(localStorage.getItem(query_key))
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
