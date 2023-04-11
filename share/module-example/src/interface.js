define('two/exampleModule/ui', [
    'two/ui',
    'two/exampleModule',
    'two/exampleModule/settings',
    'two/exampleModule/settings/map',
    'two/Settings',
    'two/EventScope',
    'two/utils',
    'queues/EventQueue'
], function (
    interfaceOverflow,
    exampleModule,
    SETTINGS,
    SETTINGS_MAP,
    Settings,
    EventScope,
    utils,
    eventQueue
) {
    let $scope
    let settings
    let presetList = modelDataService.getPresetList()
    let groupList = modelDataService.getGroupList()
    let $button
    
    const TAB_TYPES = {
        SETTINGS: 'settings',
        SOME_VIEW: 'some_view'
    }

    const selectTab = function (tabType) {
        $scope.selectedTab = tabType
    }

    const saveSettings = function () {
        settings.setAll(settings.decode($scope.settings))

        utils.notif('success', 'Settings saved')
    }

    const switchState = function () {
        if (exampleModule.isRunning()) {
            exampleModule.stop()
        } else {
            exampleModule.start()
        }
    }

    const eventHandlers = {
        updatePresets: function () {
            $scope.presets = Settings.encodeList(presetList.getPresets(), {
                disabled: false,
                type: 'presets'
            })
        },
        updateGroups: function () {
            $scope.groups = Settings.encodeList(groupList.getGroups(), {
                disabled: false,
                type: 'groups'
            })
        },
        start: function () {
            $scope.running = true

            $button.classList.remove('btn-orange')
            $button.classList.add('btn-red')

            utils.notif('success', 'Example module started')
        },
        stop: function () {
            $scope.running = false

            $button.classList.remove('btn-red')
            $button.classList.add('btn-orange')

            utils.notif('success', 'Example module stopped')
        }
    }

    const init = function () {
        settings = exampleModule.getSettings()
        $button = interfaceOverflow.addMenuButton('Example', 1 /*buttom position weight 1-99*/)
        $button.addEventListener('click', buildWindow)

        interfaceOverflow.addTemplate('twoverflow_example_module_window', `___example_module_html_main`)
        interfaceOverflow.addStyle('___example_module_css_style')
    }

    const buildWindow = function () {
        $scope = $rootScope.$new()
        $scope.SETTINGS = SETTINGS
        $scope.TAB_TYPES = TAB_TYPES
        $scope.running = exampleModule.isRunning()
        $scope.selectedTab = TAB_TYPES.SETTINGS
        $scope.settingsMap = SETTINGS_MAP

        settings.injectScope($scope)
        eventHandlers.updatePresets()
        eventHandlers.updateGroups()

        $scope.selectTab = selectTab
        $scope.saveSettings = saveSettings
        $scope.switchState = switchState

        let eventScope = new EventScope('twoverflow_example_module_window', function onDestroy () {
            console.log('example window closed')
        })

        // all those event listeners will be destroyed as soon as the window gets closed
        eventScope.register(eventTypeProvider.ARMY_PRESET_UPDATE, eventHandlers.updatePresets, true /*true = native game event*/)
        eventScope.register(eventTypeProvider.ARMY_PRESET_DELETED, eventHandlers.updatePresets, true)
        eventScope.register(eventTypeProvider.GROUPS_CREATED, eventHandlers.updateGroups, true)
        eventScope.register(eventTypeProvider.GROUPS_DESTROYED, eventHandlers.updateGroups, true)
        eventScope.register(eventTypeProvider.GROUPS_UPDATED, eventHandlers.updateGroups, true)
        eventScope.register(eventTypeProvider.EXAMPLE_MODULE_START, eventHandlers.start)
        eventScope.register(eventTypeProvider.EXAMPLE_MODULE_STOP, eventHandlers.stop)
        
        windowManagerService.getScreenWithInjectedScope('!twoverflow_example_module_window', $scope)
    }

    return init
})
