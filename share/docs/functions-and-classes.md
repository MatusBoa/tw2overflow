# EventScope

Used to attach temporary events while the window is opened.

#### `new EventScope( window_id [, on_destroy ] )`

 - *String* `window_id` Id of the window template. Templates are created with `interfaceOverflow.addTemplate`
 - *Function* `on_destroy` Function called when the window is closed.

#### `eventScope.register( id, handler )`

Register an event.

 - *String* `id` Event id. The complete list of events can be accessed via `eventTypeProvider`
 - *Function* `handler` Function called when the event is triggered.

#### `eventScope.destroy()`

Destroy all registered events.

# Settings

#### `settings.get( id )`

Get the current value of the specified setting.

 - *String* `id` ID of the setting specified on the settings map.

#### `settings.getAll()` **Object**

Get a list with the values of all settings.

#### `settings.getDefault( id )`

Get the default value for the specified setting.

 - *String* `id` ID of the setting specified on the settings map.

#### `settings.set( id, value, context )`

Set the value of a setting.

 - *String* `id` ID of the setting specified on the settings map.
 - *Any* `value` Value to be set.
 - *Any* `context` This argument is passed to the function set with `.onChange()`.

#### `settings.setAll( values, context )`

Same as `.set()` but for multiple values at once.

 - *Object* `values` IDs and values to be set.
 - *Any* `context` This argument is passed to the function set with `.onChange()`.

#### `settings.reset( id, context )`

Reset some setting to its default value.

 - *String* `id` ID of the setting specified on the settings map.
 - *Any* `context` This argument is passed to the function set with `.onChange()`.

#### `settings.resetAll( context )`

Same as `.reset()` but for all settings at once.

 - *Any* `context` This argument is passed to the function set with `.onChange()`.

#### `settings.each( callback )`

Iterate through all settings.

 - *Function* `callback` Called for every setting.

##### Callback paramenters

 - *String* `id` ID of the setting specified on the settings map.
 - *Any* `value` Current value of the setting.
 - *Object* `map` Setting info like default, type, etc...

#### `settings.onChange( callback )`

Set the function to be called everytime some setting is altered.

 - *Function* `callback` Called for every setting change.

##### Callback paramenters

 - *Object* `changes` ID and value of the altered settings.
 - *Array* `updates` Keywords affected by the altered settings. Those keywords are specified in the [https://gitlab.com/relaxeaza/twoverflow/blob/docs/share/docs/settings-map.md](settings map).
 - *Any* `context` This argument is received from the paramenter `context` passed on `.set()` and `.setAll()`.

#### `settings.injectScope( $scope, options )`

Encoded and inject the settings into the `$scope` object so it can be used by the interface view.

 - *Object* `$scope` This is an [AngularJS $scope](https://docs.angularjs.org/guide/scope) create by `$rootScope.$new()`.
 - *Object* `options` Options passed to the encoder `.encode()`.

#### `settings.updateScope()`

Regenerate the injected settings.

#### `settings.encode( options )`

Encode the settings to a format that can be readable by the interface view.

 - *Object* `options` Those options are used on settings that doesn't have its own options specified on the setting map. See the complete list of options on [https://gitlab.com/relaxeaza/twoverflow/blob/docs/share/docs/settings-map.md](settings map).

#### `settings.decode( encodedSettings )`

Decode the settings to a format that can be stored and managed internally.

 - *Object* `encodedSettings` The encoded settings by `.encode()`. Normally stored in `$scope.settings` and inject by `.injectScope()`.

# interfaceOverflow

Used to create interface buttons and store/inject interface related data.

#### `interfaceOverflow.addTemplate( path, data )`

Add a HTML template used to build windows.

 - *String* `path` Templates's ID.
 - *String* `data` Templates's HTML.

#### `interfaceOverflow.addStyle( styles )`

Inject CSS styles into the document.

 - *String* `styles` CSS Stylesheet.

#### `interfaceOverflow.addMenuButton( label, order [, _tooltip ] )`

Create an button inside the main menu.

 - *String* `label` Text label inside the button.
 - *Number* `order` The weight of the item from 1 to 99. The bigger number the lower it gets.
 - *String* `_tooltip` Tooltip text when hovering the button.

#### `interfaceOverflow.addDivisor( order )`

Create an divisor inside the main menu.

 - *Number* `order` The weight of the item from 1 to 99. The bigger number the lower it gets.

#### `interfaceOverflow.isInitialized()`

Return `true` if the interface is ready to be used.

# twoMapData

Load basic info about all villages present in the would like coordinates, owner and tribe.

#### `twoMapData.load( callback, force )`

Get already fetched data or fetch it again.

 - *Function* `callback` Function called with the data.
 - *Boolean* `force` Force downloading up-to-date data.

#### `twoMapData.getVillages()`

All fetched villages.

#### `twoMapData.isLoaded()`

Check if the data is already ready to be used.

# ready

Execute code only when specific elements of game has been loaded.

#### `ready( callback [, readyElements ] )`

- *Function* `callback` Function called when all parts has been loaded.
- *Array|String* `readyElements` List with all ready-elements to wait befored executing code. The default value if not specified is `map`.

##### List of available `readyElements`

Check out `/ready.js` for an up-to-date list.

 - `map`
 - `tribe_relations`
 - `initial_village`
 - `all_villages_ready`
 - `minimap_data`
 - `presets`
 - `world_config`
