define('two/builderQueue/defaultOrders', [
    'conf/buildingTypes'
], function (
    BUILDING_TYPES
) {
    const defaultSequences = {};
    
    const shuffle = function (array) {
        array.sort(() => Math.random() - 0.5);
    };

    const parseSequence = function (rawSequence) {
        let parsed = [];

        for (let i = 0; i < rawSequence.length; i++) {
            const item = rawSequence[i];

            if (Array.isArray(item)) {
                shuffle(item);
                parsed = parsed.concat(item);
            } else {
                parsed.push(item);
            }
        }

        return parsed;
    };

    const parseSequences = function (rawSequences) {
        const parsed = {};

        for (const i in rawSequences) {
            if (hasOwn.call(rawSequences, i)) {
                parsed[i] = parseSequence(rawSequences[i]);
            }
        }

        return parsed;
    };

    defaultSequences['Essential'] = [
        BUILDING_TYPES.HEADQUARTER, // 1
        BUILDING_TYPES.FARM, // 1
        BUILDING_TYPES.WAREHOUSE, // 1
        BUILDING_TYPES.RALLY_POINT, // 1
        BUILDING_TYPES.BARRACKS, // 1
        [
            // Quest: The Resources
            BUILDING_TYPES.TIMBER_CAMP, // 1
            BUILDING_TYPES.TIMBER_CAMP, // 2
            BUILDING_TYPES.CLAY_PIT, // 1
            BUILDING_TYPES.IRON_MINE, // 1

            BUILDING_TYPES.HEADQUARTER, // 2
            BUILDING_TYPES.RALLY_POINT // 2
        ],
        [
            // Quest: First Steps
            BUILDING_TYPES.FARM, // 2
            BUILDING_TYPES.WAREHOUSE, // 2
            
            // Quest: Laying Down Foundation
            BUILDING_TYPES.CLAY_PIT, // 2
            BUILDING_TYPES.IRON_MINE // 2
        ],
        [
            // Quest: More Resources
            BUILDING_TYPES.TIMBER_CAMP, // 3
            BUILDING_TYPES.CLAY_PIT, // 3
            BUILDING_TYPES.IRON_MINE, // 3
            
            // Quest: Resource Building
            BUILDING_TYPES.WAREHOUSE, // 3
            BUILDING_TYPES.TIMBER_CAMP, // 4
            BUILDING_TYPES.CLAY_PIT, // 4
            BUILDING_TYPES.IRON_MINE // 4
        ],
        [
            // Quest: Get an Overview
            BUILDING_TYPES.WAREHOUSE, // 4
            BUILDING_TYPES.TIMBER_CAMP, // 5
            BUILDING_TYPES.CLAY_PIT, // 5
            BUILDING_TYPES.IRON_MINE, // 5

            // Quest: Capital
            BUILDING_TYPES.FARM, // 3
            BUILDING_TYPES.WAREHOUSE, // 5
            BUILDING_TYPES.HEADQUARTER // 3
        ],
        [
            // Quest: The Hero
            BUILDING_TYPES.STATUE, // 1

            // Quest: Resource Expansions
            BUILDING_TYPES.TIMBER_CAMP, // 6
            BUILDING_TYPES.CLAY_PIT, // 6
            BUILDING_TYPES.IRON_MINE // 6
        ],
        [
            // Quest: Military
            BUILDING_TYPES.BARRACKS, // 2

            // Quest: The Hospital
            BUILDING_TYPES.HEADQUARTER, // 4
            BUILDING_TYPES.TIMBER_CAMP, // 7
            BUILDING_TYPES.CLAY_PIT, // 7
            BUILDING_TYPES.IRON_MINE, // 7
            BUILDING_TYPES.FARM, // 4
            BUILDING_TYPES.HOSPITAL // 1
        ],
        [
            // Quest: Resources
            BUILDING_TYPES.TIMBER_CAMP, // 8
            BUILDING_TYPES.CLAY_PIT, // 8
            BUILDING_TYPES.IRON_MINE // 8
        ],
        // Quest: The Wall
        BUILDING_TYPES.WAREHOUSE, // 6
        BUILDING_TYPES.HEADQUARTER, // 5
        BUILDING_TYPES.WALL, // 1
        [
            // Quest: Village Improvements
            BUILDING_TYPES.TIMBER_CAMP, // 9
            BUILDING_TYPES.CLAY_PIT, // 9
            BUILDING_TYPES.IRON_MINE, // 9
            BUILDING_TYPES.TIMBER_CAMP, // 10
            BUILDING_TYPES.CLAY_PIT, // 10
            BUILDING_TYPES.IRON_MINE, // 10
            BUILDING_TYPES.FARM // 5
        ],
        BUILDING_TYPES.FARM, // 6
        BUILDING_TYPES.FARM, // 7
        [
            // Quest: Hard work
            BUILDING_TYPES.TIMBER_CAMP, // 11
            BUILDING_TYPES.CLAY_PIT, // 11
            BUILDING_TYPES.IRON_MINE, // 11
            BUILDING_TYPES.TIMBER_CAMP, // 12
            BUILDING_TYPES.CLAY_PIT, // 12
            BUILDING_TYPES.IRON_MINE // 12
        ],
        [
            // Quest: The way of defence
            BUILDING_TYPES.BARRACKS, // 3

            BUILDING_TYPES.WAREHOUSE, // 7
            BUILDING_TYPES.WAREHOUSE, // 8
            BUILDING_TYPES.FARM, // 8
            BUILDING_TYPES.WAREHOUSE, // 9
            BUILDING_TYPES.WAREHOUSE // 10
        ],
        [
            // Quest: Market Barker
            BUILDING_TYPES.HEADQUARTER, // 6
            BUILDING_TYPES.MARKET, // 1

            // Quest: Preparations
            BUILDING_TYPES.BARRACKS, // 4
            BUILDING_TYPES.WALL, // 2
            BUILDING_TYPES.WALL // 3
        ],
        [
            BUILDING_TYPES.FARM, // 9
            BUILDING_TYPES.FARM, // 10

            BUILDING_TYPES.BARRACKS, // 5
            BUILDING_TYPES.WAREHOUSE, // 11
            BUILDING_TYPES.FARM // 11
        ],
        [
            BUILDING_TYPES.BARRACKS, // 6
            BUILDING_TYPES.WAREHOUSE, // 12
            BUILDING_TYPES.FARM, // 12

            BUILDING_TYPES.BARRACKS, // 7
            BUILDING_TYPES.WAREHOUSE, // 13
            BUILDING_TYPES.FARM // 13
        ],
        [
            BUILDING_TYPES.WALL, // 4
            BUILDING_TYPES.WALL, // 5
            BUILDING_TYPES.WALL, // 6

            BUILDING_TYPES.MARKET, // 2
            BUILDING_TYPES.MARKET, // 3
            BUILDING_TYPES.MARKET // 4
        ],
        [
            BUILDING_TYPES.BARRACKS, // 8
            BUILDING_TYPES.BARRACKS, // 9

            BUILDING_TYPES.HEADQUARTER, // 7
            BUILDING_TYPES.HEADQUARTER // 8
        ],
        [
            BUILDING_TYPES.TAVERN, // 1
            BUILDING_TYPES.TAVERN, // 2
            BUILDING_TYPES.TAVERN, // 3

            BUILDING_TYPES.RALLY_POINT // 3
        ],
        [
            BUILDING_TYPES.BARRACKS, // 10
            BUILDING_TYPES.BARRACKS, // 11

            BUILDING_TYPES.WAREHOUSE, // 14
            BUILDING_TYPES.FARM // 14
        ],
        [
            BUILDING_TYPES.WAREHOUSE, // 15
            BUILDING_TYPES.FARM, // 15

            BUILDING_TYPES.BARRACKS, // 12
            BUILDING_TYPES.BARRACKS // 13
        ],
        [
            BUILDING_TYPES.STATUE, // 2
            BUILDING_TYPES.STATUE, // 3

            BUILDING_TYPES.WALL, // 7
            BUILDING_TYPES.WALL // 8
        ],
        [
            BUILDING_TYPES.HEADQUARTER, // 9
            BUILDING_TYPES.HEADQUARTER, // 10

            BUILDING_TYPES.WAREHOUSE, // 16
            BUILDING_TYPES.FARM, // 16
            BUILDING_TYPES.FARM // 17
        ],
        [
            BUILDING_TYPES.IRON_MINE, // 13
            BUILDING_TYPES.IRON_MINE, // 14
            BUILDING_TYPES.IRON_MINE, // 15

            BUILDING_TYPES.WAREHOUSE // 17
        ],
        [
            BUILDING_TYPES.BARRACKS, // 14
            BUILDING_TYPES.BARRACKS, // 15

            BUILDING_TYPES.WAREHOUSE, // 18
            BUILDING_TYPES.FARM // 18
        ],
        [
            BUILDING_TYPES.WALL, // 9
            BUILDING_TYPES.WALL, // 10

            BUILDING_TYPES.TAVERN, // 4
            BUILDING_TYPES.TAVERN, // 5
            BUILDING_TYPES.TAVERN // 6
        ],
        [
            BUILDING_TYPES.MARKET, // 5
            BUILDING_TYPES.MARKET, // 6
            BUILDING_TYPES.MARKET, // 7

            BUILDING_TYPES.WAREHOUSE, // 19
            BUILDING_TYPES.FARM, // 19
            BUILDING_TYPES.WAREHOUSE, // 20
            BUILDING_TYPES.FARM, // 20
            BUILDING_TYPES.WAREHOUSE, // 21
            BUILDING_TYPES.FARM // 21
        ],
        [
            BUILDING_TYPES.IRON_MINE, // 16
            BUILDING_TYPES.IRON_MINE, // 17
            BUILDING_TYPES.IRON_MINE, // 18

            BUILDING_TYPES.RALLY_POINT // 4
        ],
        [
            BUILDING_TYPES.BARRACKS, // 16
            BUILDING_TYPES.BARRACKS, // 17

            BUILDING_TYPES.FARM, // 22
            BUILDING_TYPES.FARM, // 23
            BUILDING_TYPES.FARM, // 24
            BUILDING_TYPES.FARM // 25
        ],
        [
            BUILDING_TYPES.WAREHOUSE, // 22
            BUILDING_TYPES.WAREHOUSE, // 23

            BUILDING_TYPES.HEADQUARTER, // 11
            BUILDING_TYPES.HEADQUARTER // 12
        ],
        [
            BUILDING_TYPES.STATUE, // 4
            BUILDING_TYPES.STATUE, // 5

            BUILDING_TYPES.FARM, // 26
            BUILDING_TYPES.BARRACKS // 18
        ],
        [
            BUILDING_TYPES.HEADQUARTER, // 14
            BUILDING_TYPES.HEADQUARTER, // 15

            BUILDING_TYPES.FARM, // 27
            BUILDING_TYPES.BARRACKS // 19
        ],
        [
            BUILDING_TYPES.HEADQUARTER, // 15
            BUILDING_TYPES.HEADQUARTER, // 16

            BUILDING_TYPES.BARRACKS, // 20

            BUILDING_TYPES.HEADQUARTER, // 17
            BUILDING_TYPES.HEADQUARTER, // 18
            BUILDING_TYPES.HEADQUARTER, // 19
            BUILDING_TYPES.HEADQUARTER // 20
        ],
        [
            BUILDING_TYPES.ACADEMY, // 1

            BUILDING_TYPES.FARM, // 28
            BUILDING_TYPES.WAREHOUSE, // 23
            BUILDING_TYPES.WAREHOUSE, // 24
            BUILDING_TYPES.WAREHOUSE // 25
        ],
        [
            BUILDING_TYPES.MARKET, // 8
            BUILDING_TYPES.MARKET, // 9
            BUILDING_TYPES.MARKET, // 10

            BUILDING_TYPES.TIMBER_CAMP, // 13
            BUILDING_TYPES.CLAY_PIT, // 13
            BUILDING_TYPES.IRON_MINE // 19
        ],
        [
            BUILDING_TYPES.TIMBER_CAMP, // 14
            BUILDING_TYPES.CLAY_PIT, // 14
            BUILDING_TYPES.TIMBER_CAMP, // 15
            BUILDING_TYPES.CLAY_PIT, // 15

            BUILDING_TYPES.TIMBER_CAMP, // 16
            BUILDING_TYPES.TIMBER_CAMP // 17
        ],
        [
            BUILDING_TYPES.WALL, // 11
            BUILDING_TYPES.WALL, // 12

            BUILDING_TYPES.MARKET, // 11
            BUILDING_TYPES.MARKET, // 12
            BUILDING_TYPES.MARKET // 13
        ],
        [
            BUILDING_TYPES.TIMBER_CAMP, // 18
            BUILDING_TYPES.CLAY_PIT, // 16
            BUILDING_TYPES.TIMBER_CAMP, // 19
            BUILDING_TYPES.CLAY_PIT, // 17

            BUILDING_TYPES.TAVERN, // 7
            BUILDING_TYPES.TAVERN, // 8
            BUILDING_TYPES.TAVERN // 9
        ],
        [
            BUILDING_TYPES.WALL, // 13
            BUILDING_TYPES.WALL, // 14

            BUILDING_TYPES.TIMBER_CAMP, // 20
            BUILDING_TYPES.CLAY_PIT, // 18
            BUILDING_TYPES.IRON_MINE // 20
        ],
        [
            BUILDING_TYPES.TIMBER_CAMP, // 21
            BUILDING_TYPES.CLAY_PIT, // 19
            BUILDING_TYPES.IRON_MINE, // 21

            BUILDING_TYPES.BARRACKS, // 21
            BUILDING_TYPES.BARRACKS, // 22
            BUILDING_TYPES.BARRACKS // 23
        ],
        [
            BUILDING_TYPES.FARM, // 29
            BUILDING_TYPES.WAREHOUSE, // 26
            BUILDING_TYPES.WAREHOUSE, // 27

            BUILDING_TYPES.TAVERN, // 10
            BUILDING_TYPES.TAVERN, // 11
            BUILDING_TYPES.TAVERN // 12
        ],
        [
            BUILDING_TYPES.TIMBER_CAMP, // 22
            BUILDING_TYPES.CLAY_PIT, // 20
            BUILDING_TYPES.IRON_MINE, // 22

            BUILDING_TYPES.TIMBER_CAMP, // 23
            BUILDING_TYPES.CLAY_PIT, // 21
            BUILDING_TYPES.IRON_MINE // 23
        ],
        [
            BUILDING_TYPES.TIMBER_CAMP, // 24
            BUILDING_TYPES.CLAY_PIT, // 22
            BUILDING_TYPES.IRON_MINE, // 24

            BUILDING_TYPES.BARRACKS, // 24
            BUILDING_TYPES.BARRACKS // 25
        ],
        [
            BUILDING_TYPES.FARM, // 30
            BUILDING_TYPES.WAREHOUSE, // 28
            BUILDING_TYPES.WAREHOUSE, // 29

            BUILDING_TYPES.WALL, // 15
            BUILDING_TYPES.WALL, // 16
            BUILDING_TYPES.WALL, // 17
            BUILDING_TYPES.WALL // 18
        ],
        [
            BUILDING_TYPES.TAVERN, // 13
            BUILDING_TYPES.TAVERN, // 14

            BUILDING_TYPES.RALLY_POINT, // 5

            BUILDING_TYPES.TIMBER_CAMP, // 25
            BUILDING_TYPES.CLAY_PIT, // 23
            BUILDING_TYPES.IRON_MINE // 25
        ],
        [
            BUILDING_TYPES.TIMBER_CAMP, // 26
            BUILDING_TYPES.CLAY_PIT, // 24
            BUILDING_TYPES.IRON_MINE, // 26

            BUILDING_TYPES.TIMBER_CAMP, // 27
            BUILDING_TYPES.CLAY_PIT, // 25
            BUILDING_TYPES.IRON_MINE // 27
        ],
        [
            BUILDING_TYPES.TIMBER_CAMP, // 28
            BUILDING_TYPES.CLAY_PIT, // 26
            BUILDING_TYPES.IRON_MINE, // 28

            BUILDING_TYPES.TIMBER_CAMP, // 29
            BUILDING_TYPES.CLAY_PIT, // 27
            BUILDING_TYPES.CLAY_PIT, // 28
            BUILDING_TYPES.IRON_MINE // 29
        ],
        [
            BUILDING_TYPES.TIMBER_CAMP, // 30
            BUILDING_TYPES.CLAY_PIT, // 29
            BUILDING_TYPES.CLAY_PIT, // 30
            BUILDING_TYPES.IRON_MINE, // 30

            BUILDING_TYPES.WALL, // 19
            BUILDING_TYPES.WALL // 20
        ]
    ];

    defaultSequences['Full Village'] = [
        [
            BUILDING_TYPES.HOSPITAL, // 2
            BUILDING_TYPES.HOSPITAL, // 3
            BUILDING_TYPES.HOSPITAL, // 4
            BUILDING_TYPES.HOSPITAL, // 5

            BUILDING_TYPES.MARKET, // 14
            BUILDING_TYPES.MARKET, // 15
            BUILDING_TYPES.MARKET, // 16
            BUILDING_TYPES.MARKET // 17
        ],
        [
            BUILDING_TYPES.HEADQUARTER, // 21
            BUILDING_TYPES.HEADQUARTER, // 22
            BUILDING_TYPES.HEADQUARTER, // 23
            BUILDING_TYPES.HEADQUARTER, // 24
            BUILDING_TYPES.HEADQUARTER, // 25

            BUILDING_TYPES.PRECEPTORY, // 1

            BUILDING_TYPES.HOSPITAL, // 6
            BUILDING_TYPES.HOSPITAL, // 7
            BUILDING_TYPES.HOSPITAL, // 8
            BUILDING_TYPES.HOSPITAL, // 9
            BUILDING_TYPES.HOSPITAL // 10
        ],
        [
            BUILDING_TYPES.MARKET, // 18
            BUILDING_TYPES.MARKET, // 19
            BUILDING_TYPES.MARKET, // 20
            BUILDING_TYPES.MARKET, // 21

            BUILDING_TYPES.PRECEPTORY, // 2
            BUILDING_TYPES.PRECEPTORY, // 3

            BUILDING_TYPES.MARKET, // 22
            BUILDING_TYPES.MARKET, // 23
            BUILDING_TYPES.MARKET, // 24
            BUILDING_TYPES.MARKET // 25
        ],
        [
            BUILDING_TYPES.HEADQUARTER, // 26
            BUILDING_TYPES.HEADQUARTER, // 27
            BUILDING_TYPES.HEADQUARTER, // 28
            BUILDING_TYPES.HEADQUARTER, // 29
            BUILDING_TYPES.HEADQUARTER, // 30

            BUILDING_TYPES.PRECEPTORY, // 4
            BUILDING_TYPES.PRECEPTORY, // 5
            BUILDING_TYPES.PRECEPTORY, // 6
            BUILDING_TYPES.PRECEPTORY, // 7
            BUILDING_TYPES.PRECEPTORY, // 8
            BUILDING_TYPES.PRECEPTORY, // 9
            BUILDING_TYPES.PRECEPTORY // 10
        ]
    ];

    Array.prototype.unshift.apply(
        defaultSequences['Full Village'],
        defaultSequences['Essential']
    );

    defaultSequences['Essential Without Wall'] =
        defaultSequences['Essential'].filter(function (building) {
            return building !== BUILDING_TYPES.WALL;
        });

    defaultSequences['Full Wall'] = [
        BUILDING_TYPES.WALL,
        BUILDING_TYPES.WALL,
        BUILDING_TYPES.WALL,
        BUILDING_TYPES.WALL,
        BUILDING_TYPES.WALL,
        BUILDING_TYPES.WALL,
        BUILDING_TYPES.WALL,
        BUILDING_TYPES.WALL,
        BUILDING_TYPES.WALL,
        BUILDING_TYPES.WALL,
        BUILDING_TYPES.WALL,
        BUILDING_TYPES.WALL,
        BUILDING_TYPES.WALL,
        BUILDING_TYPES.WALL,
        BUILDING_TYPES.WALL,
        BUILDING_TYPES.WALL,
        BUILDING_TYPES.WALL,
        BUILDING_TYPES.WALL,
        BUILDING_TYPES.WALL,
        BUILDING_TYPES.WALL // 20
    ];

    defaultSequences['Full Farm'] = [
        BUILDING_TYPES.FARM,
        BUILDING_TYPES.FARM,
        BUILDING_TYPES.FARM,
        BUILDING_TYPES.FARM,
        BUILDING_TYPES.FARM,
        BUILDING_TYPES.FARM,
        BUILDING_TYPES.FARM,
        BUILDING_TYPES.FARM,
        BUILDING_TYPES.FARM,
        BUILDING_TYPES.FARM,
        BUILDING_TYPES.FARM,
        BUILDING_TYPES.FARM,
        BUILDING_TYPES.FARM,
        BUILDING_TYPES.FARM,
        BUILDING_TYPES.FARM,
        BUILDING_TYPES.FARM,
        BUILDING_TYPES.FARM,
        BUILDING_TYPES.FARM,
        BUILDING_TYPES.FARM,
        BUILDING_TYPES.FARM,
        BUILDING_TYPES.FARM,
        BUILDING_TYPES.FARM,
        BUILDING_TYPES.FARM,
        BUILDING_TYPES.FARM,
        BUILDING_TYPES.FARM,
        BUILDING_TYPES.FARM,
        BUILDING_TYPES.FARM,
        BUILDING_TYPES.FARM,
        BUILDING_TYPES.FARM,
        BUILDING_TYPES.FARM // 30
    ];

    return parseSequences(defaultSequences);
});
