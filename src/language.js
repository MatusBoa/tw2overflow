define('two/language', [
    'helper/i18n'
], function (
    i18n
) {
    let initialized = false;
    // eslint-disable-next-line
    const languages = ___overflow_lang;
    const DEFAULT_LANG = 'en_us';
    const SHARED_LANGS = {
        'en_dk': 'en_us',
        'pt_pt': 'pt_br'
    };

    function selectLanguage (langId) {
        langId = hasOwn.call(SHARED_LANGS, langId) ? SHARED_LANGS[langId] : langId;
        i18n.setJSON(languages[langId] || languages[DEFAULT_LANG]);
    }

    const twoLanguage = {};

    twoLanguage.init = function () {
        if (initialized) {
            return false;
        }

        initialized = true;
        
        selectLanguage($rootScope.loc.ale);

        // trigger eventTypeProvider.LANGUAGE_SELECTED_CHANGED you dumb fucks
        $rootScope.$watch('loc.ale', function (newValue, oldValue) {
            if (newValue !== oldValue) {
                selectLanguage($rootScope.loc.ale);
            }
        });
    };

    return twoLanguage;
});
