define('two/attackView/unitSpeedOrder', [
    'conf/unitTypes'
], function (
    UNIT_TYPES
) {
    return [
        UNIT_TYPES.LIGHT_CAVALRY,
        UNIT_TYPES.HEAVY_CAVALRY,
        UNIT_TYPES.AXE,
        UNIT_TYPES.SWORD,
        UNIT_TYPES.RAM,
        UNIT_TYPES.SNOB,
        UNIT_TYPES.TREBUCHET
    ];
});
