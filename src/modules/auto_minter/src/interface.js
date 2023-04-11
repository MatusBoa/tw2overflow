define('two/autoMinter/ui', [
    'two/ui',
    'two/autoMinter',
    'two/autoMinter/settings',
    'two/autoMinter/settings/map',
    'two/Settings',
    'two/EventScope',
    'two/utils',
    'queues/EventQueue'
], function (
    interfaceOverflow,
    autoMinter,
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
        if (autoMinter.isRunning()) {
            autoMinter.stop();
        } else {
            autoMinter.start();
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

            utils.notif('success', 'Auto Minter started');
        },
        stop: function () {
            $scope.running = false;

            $button.classList.remove('btn-red');
            $button.classList.add('btn-orange');

            utils.notif('success', 'Auto Minter stopped');
        }
    };

    const init = function () {
        settings = autoMinter.getSettings();
        $button = interfaceOverflow.addMenuButton('AutoMinter', 51);
        $button.addEventListener('click', buildWindow);

        interfaceOverflow.addTemplate('twoverflow_auto_minter_window', `___auto_minter_html_main`);
        interfaceOverflow.addStyle('___auto_minter_css_style');
    };

    const buildWindow = function () {
        $scope = $rootScope.$new();
        $scope.SETTINGS = SETTINGS;
        $scope.TAB_TYPES = TAB_TYPES;
        $scope.running = autoMinter.isRunning();
        $scope.selectedTab = TAB_TYPES.SETTINGS;
        $scope.settingsMap = SETTINGS_MAP;

        settings.injectScope($scope);
        eventHandlers.updateGroups();

        $scope.selectTab = selectTab;
        $scope.saveSettings = saveSettings;
        $scope.switchState = switchState;

        const eventScope = new EventScope('twoverflow_auto_minter_window', function onDestroy () {});

        eventScope.register(eventTypeProvider.GROUPS_CREATED, eventHandlers.updateGroups, true);
        eventScope.register(eventTypeProvider.GROUPS_DESTROYED, eventHandlers.updateGroups, true);
        eventScope.register(eventTypeProvider.GROUPS_UPDATED, eventHandlers.updateGroups, true);
        eventScope.register(eventTypeProvider.AUTO_MINTER_START, eventHandlers.start);
        eventScope.register(eventTypeProvider.AUTO_MINTER_STOP, eventHandlers.stop);
        
        windowManagerService.getScreenWithInjectedScope('!twoverflow_auto_minter_window', $scope);
    };

    return init;
});
