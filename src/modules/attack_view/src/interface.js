define('two/attackView/ui', [
    'two/ui',
    'two/attackView',
    'two/EventScope',
    'two/utils',
    'two/attackView/types/columns',
    'two/attackView/types/commands',
    'two/attackView/types/filters',
    'two/attackView/unitSpeedOrder',
    'conf/unitTypes',
    'queues/EventQueue',
    'helper/time',
    'battlecat'
], function (
    interfaceOverflow,
    attackView,
    EventScope,
    utils,
    COLUMN_TYPES,
    COMMAND_TYPES,
    FILTER_TYPES,
    UNIT_SPEED_ORDER,
    UNIT_TYPES,
    eventQueue,
    timeHelper,
    $
) {
    let $scope;
    let $button;

    const nowSeconds = function () {
        return Date.now() / 1000;
    };

    const copyTimeModal = function (time) {
        const modalScope = $rootScope.$new();
        modalScope.text = $filter('readableDateFilter')(time * 1000, $rootScope.loc.ale, $rootScope.GAME_TIMEZONE, $rootScope.GAME_TIME_OFFSET, 'H:mm:ss:sss dd/MM/yyyy');
        modalScope.title = $filter('i18n')('copy', $rootScope.loc.ale, 'attack_view');
        windowManagerService.getModal('!twoverflow_attack_view_show_text_modal', modalScope);
    };

    const removeTroops = function (command) {
        const formatedDate = $filter('readableDateFilter')((command.time_completed - 10) * 1000, $rootScope.loc.ale, $rootScope.GAME_TIMEZONE, $rootScope.GAME_TIME_OFFSET, 'H:mm:ss:sss dd/MM/yyyy');
        attackView.setCommander(command, formatedDate);
    };

    const switchWindowSize = function () {
        const $window = $('#two-attack-view').parent();
        const $wrapper = $('#wrapper');

        $window.toggleClass('fullsize');
        $wrapper.toggleClass('window-fullsize');
    };

    const updateVisibileCommands = function () {
        const offset = $scope.pagination.offset;
        const limit = $scope.pagination.limit;

        $scope.visibleCommands = $scope.commands.slice(offset, offset + limit);
        $scope.pagination.count = $scope.commands.length;
    };

    const checkCommands = function () {
        const now = Date.now();

        for (let i = 0; i < $scope.commands.length; i++) {
            if ($scope.commands[i].model.percent(now) === 100) {
                $scope.commands.splice(i, 1);
            }
        }

        updateVisibileCommands();
    };

    // scope functions

    const toggleFilter = function (type, _filter) {
        attackView.toggleFilter(type, _filter);
        $scope.filters = attackView.getFilters();
    };

    const toggleSorting = function (column) {
        attackView.toggleSorting(column);
        $scope.sorting = attackView.getSortings();
    };

    const eventHandlers = {
        updateCommands: function () {
            $scope.commands = attackView.getCommands();
        },
        onVillageSwitched: function () {
            $scope.selectedVillageId = modelDataService.getSelectedVillage().getId();
        }
    };

    const init = function () {
        $button = interfaceOverflow.addMenuButton('AttackView', 40);
        $button.addEventListener('click', buildWindow);

        interfaceOverflow.addTemplate('twoverflow_attack_view_main', `___attack_view_html_main`);
        interfaceOverflow.addTemplate('twoverflow_attack_view_show_text_modal', `___attack_view_html_modal-show-text`);
        interfaceOverflow.addStyle('___attack_view_css_style');
    };

    const buildWindow = function () {
        $scope = $rootScope.$new();
        $scope.commandQueueEnabled = attackView.commandQueueEnabled();
        $scope.commands = attackView.getCommands();
        $scope.selectedVillageId = modelDataService.getSelectedVillage().getId();
        $scope.filters = attackView.getFilters();
        $scope.sorting = attackView.getSortings();
        $scope.UNIT_TYPES = UNIT_TYPES;
        $scope.FILTER_TYPES = FILTER_TYPES;
        $scope.COMMAND_TYPES = COMMAND_TYPES;
        $scope.UNIT_SPEED_ORDER = UNIT_SPEED_ORDER;
        $scope.COLUMN_TYPES = COLUMN_TYPES;
        $scope.pagination = {
            count: $scope.commands.length,
            offset: 0,
            loader: updateVisibileCommands,
            limit: storageService.getPaginationLimit()
        };

        // functions
        $scope.openCharacterProfile = windowDisplayService.openCharacterProfile;
        $scope.openVillageInfo = windowDisplayService.openVillageInfo;
        $scope.jumpToVillage = mapService.jumpToVillage;
        $scope.now = nowSeconds;
        $scope.copyTimeModal = copyTimeModal;
        $scope.removeTroops = removeTroops;
        $scope.switchWindowSize = switchWindowSize;
        $scope.toggleFilter = toggleFilter;
        $scope.toggleSorting = toggleSorting;

        updateVisibileCommands();

        const eventScope = new EventScope('twoverflow_queue_window', function onWindowClose () {
            timeHelper.timer.remove(checkCommands);
        });
        eventScope.register(eventTypeProvider.MAP_SELECTED_VILLAGE, eventHandlers.onVillageSwitched, true);
        eventScope.register(eventTypeProvider.ATTACK_VIEW_COMMANDS_LOADED, eventHandlers.updateCommands);
        eventScope.register(eventTypeProvider.ATTACK_VIEW_COMMAND_CANCELLED, eventHandlers.updateCommands);
        eventScope.register(eventTypeProvider.ATTACK_VIEW_COMMAND_IGNORED, eventHandlers.updateCommands);
        eventScope.register(eventTypeProvider.ATTACK_VIEW_VILLAGE_RENAMED, eventHandlers.updateCommands);

        windowManagerService.getScreenWithInjectedScope('!twoverflow_attack_view_main', $scope);

        timeHelper.timer.add(checkCommands);
    };

    return init;
});
