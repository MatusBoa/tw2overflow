define('two/___spy_recruiter_id/ui', [
    'two/ui',
    'two/___spy_recruiter_id',
    'two/___spy_recruiter_id/settings',
    'two/___spy_recruiter_id/settings/map',
    'two/Settings',
    'two/EventScope',
    'two/utils',
    'queues/EventQueue'
], function (
    interfaceOverflow,
    ___spy_recruiter_id,
    SETTINGS,
    SETTINGS_MAP,
    Settings,
    EventScope,
    utils,
    eventQueue
) {
    let $scope;
    let settings;
    const groupList = modelDataService.getGroupList();
    let $button;
    
    const TAB_TYPES = {
        SETTINGS: 'settings'
    };

    const selectTab = function (tabType) {
        $scope.selectedTab = tabType;
    };

    const saveSettings = function () {
        if (!settings.valid('readable_time', $scope.settings[SETTINGS.CHECK_INTERVAL])) {
            return utils.notif('error', $filter('i18n')('error_invalid_interval', $rootScope.loc.ale, 'common'));
        }

        settings.setAll(settings.decode($scope.settings));

        utils.notif('success', 'Settings saved');
    };

    const switchState = function () {
        if (___spy_recruiter_id.isRunning()) {
            ___spy_recruiter_id.stop();
        } else {
            ___spy_recruiter_id.start();
        }
    };

    const eventHandlers = {
        updateGroups: function () {
            $scope.groups = Settings.encodeList(groupList.getGroups(), {
                disabled: false,
                type: 'groups'
            });
        },
        start: function () {
            $scope.running = true;

            $button.classList.remove('btn-orange');
            $button.classList.add('btn-red');

            utils.notif('success', '___spy_recruiter_title started');
        },
        stop: function () {
            $scope.running = false;

            $button.classList.remove('btn-red');
            $button.classList.add('btn-orange');

            utils.notif('success', '___spy_recruiter_title stopped');
        }
    };

    const init = function () {
        settings = ___spy_recruiter_id.getSettings();
        $button = interfaceOverflow.addMenuButton('___spy_recruiter_title', 51);
        $button.addEventListener('click', buildWindow);

        interfaceOverflow.addTemplate('twoverflow____spy_recruiter_id_window', `___spy_recruiter_html_main`);
        interfaceOverflow.addStyle('___spy_recruiter_css_style');
    };

    const buildWindow = function () {
        $scope = $rootScope.$new();
        $scope.SETTINGS = SETTINGS;
        $scope.TAB_TYPES = TAB_TYPES;
        $scope.running = ___spy_recruiter_id.isRunning();
        $scope.selectedTab = TAB_TYPES.SETTINGS;
        $scope.settingsMap = SETTINGS_MAP;

        settings.injectScope($scope);
        eventHandlers.updateGroups();

        $scope.selectTab = selectTab;
        $scope.saveSettings = saveSettings;
        $scope.switchState = switchState;

        const eventScope = new EventScope('twoverflow____spy_recruiter_id_window', function onDestroy () {});

        eventScope.register(eventTypeProvider.GROUPS_CREATED, eventHandlers.updateGroups, true);
        eventScope.register(eventTypeProvider.GROUPS_DESTROYED, eventHandlers.updateGroups, true);
        eventScope.register(eventTypeProvider.GROUPS_UPDATED, eventHandlers.updateGroups, true);
        eventScope.register(eventTypeProvider.___spy_recruiter_id_START, eventHandlers.start);
        eventScope.register(eventTypeProvider.___spy_recruiter_id_STOP, eventHandlers.stop);
        
        windowManagerService.getScreenWithInjectedScope('!twoverflow____spy_recruiter_id_window', $scope);
    };

    return init;
});
