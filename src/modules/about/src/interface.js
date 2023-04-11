define('two/about/ui', [
    'two/ui'
], function (
    interfaceOverflow
) {
    let $scope;
    
    const selectTab = function (tabType) {
        $scope.selectedTab = tabType;
    };

    const init = function () {
        interfaceOverflow.addDivisor(99);
        const $button = interfaceOverflow.addMenuButton('About', 100);

        $button.addEventListener('click', function () {
            buildWindow();
        });

        interfaceOverflow.addTemplate('twoverflow_about_window', `___about_html_main`);
        interfaceOverflow.addStyle('___about_css_style');
    };

    const buildWindow = function () {
        $scope = $rootScope.$new();
        $scope.selectTab = selectTab;

        windowManagerService.getModal('!twoverflow_about_window', $scope);
    };

    return init;
});
