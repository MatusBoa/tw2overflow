# TWOverflow Changelog

## 2.0.0

*soon*

 - **FarmOverflow:** Added setting to allow targets to receive attacks only from one village.
 - **FarmOverflow:** Added setting to allow targets to receive only one attack per village.
 - **FarmOverflow:** Added minimum interval between commands on the same target.
 - **FarmOverflow:** Added tab to show farmers, ignore/included targets.
 - **FarmOverflow:** Now you can select multiple presets to use as farm.
 - **FarmOverflow:** Added setting to limit the amount of targets for each farm village.
 - **FarmOverflow:** Now a timer for the next cycle is shown.
 - **FarmOverflow:** Fixed "Not units enough" notification errors.
 - **FarmOverflow:** Abandoned targets that gets conquered by some noob is now properly detected.
 - **FarmOverflow:** Fixed step cycle mode showing "attacking" status when waiting the next cycle.
 - **FarmOverflow:** Fixed farm gettings stuck on "Full storage" even after use resources.
 - **FarmOverflow:** Fixed village last status showing "Attacking" after stopping the farmer.
 - **FarmOverflow:** Fixed bug where some commands were being sent with less units than specified on presets.
 - **FarmOverflow:** Fixed bug where opening the window before the preset list load causing the preset input list to never show up.
 - **Minimap:** The entire minimap is now loaded at once.
 - **Minimap:** Show a rect with the current map view instead of a simple cross.
 - **Minimap:** Only draw province demarcations where villages are available.
 - **Minimap:** Minimap can only be dragged where villages are available.
 - **Minimap:** Minimap gets centered to the current view when opening it.
 - **Minimap:** Added setting to change minimap village's size.
 - **Minimap:** Current minimap mouse position is highlighted on map.
 - **Minimap:** Province and continent borders can now be disabled/enabled separately.
 - **Minimap:** Massive performace improvement.
 - **BuilderQueue:** Added setting to preserve resources.
 - **BuilderQueue:** Added setting to priorize the building farm if it's full.
 - **BuilderQueue:** Added pagination to building sequence lists.
 - **BuilderQueue:** Added preview of the sequence with building levels/costs on bottom of the window.
 - **BuilderQueue:** Added capability to add/remove/move buildings in sequences.
 - **BuilderQueue:** Added capability to create/delete entire building sequences.
 - **BuilderQueue:** Added logs view.
 - **BuilderQueue:** Added instant build job finish.
 - **BuilderQueue:** Initial building sequence "Essential" is shuffled for every new user to avoid bot detection by use pattern.
 - **BuilderQueue:** Village names on logs aren't hard coded anymore.
 - **CommandQueue:** Fixed travel times with effects being calculated the same as no effect.
 - **CommandQueue:** Fixed some units on travel time calculator not showing as valid time travel even though the time travel was valid.
 - **CommandQueue:** Fixed commands diplaying the wrong send date.
 - **CommandQueue:** Remember last selected date type. #
 - **CommandQueue:** The last date type selected is now remembered next time the window is open.
 - **AttackView:** Added pagination.
 - **AttackView:** Added sorting and filtering to commands.
 - **AutoCollector:** Fixed second village not being finished after all jobs were completed.
 - **AutoCollector:** Fixed collector trying to build second village before it's spawned.
 - **Misc:** Interface now uses the game's native system.
 - **Misc:** Changed disable button color from green to orange.
 - **Misc:** Module buttons are now a sub-menu inside a central menu.
 - **Misc:** Notifications now are replaced instead of queued.

## 1.0.7

*26/06/2018*

 - **BuilderQueue:** [Added] Highlight reached building levels for the selected villages on build order list.
 - **BuilderQueue:** [Added] Highlight queued buildings for the selected village on build order list.
 - **BuilderQueue:** [Added] Persistent logs.
 - **BuilderQueue:** [Added] Show build duration/price for each building level on building order list.
 - **BuilderQueue:** [Added] Make villages name on logs a link to the village profile.
 - **BuilderQueue:** [Updated] Remove stripped table colors.
 - **BuilderQueue:** [Fixed] Build log showing queue start date instead of creation date.
 - **BuilderQueue:** [Fixed] Interface bottom buttons showing only under the settings tab.
 - **BuilderQueue:** [Fixed] PT_br typos
 - **BuilderQueue:** [Fixed] Already reached levels are not updated when changing the building order preset.
 - **AttackView:** [Added] Improve filters interface, separate by category.
 - **AttackView:** [Added] Add slowest unit filter.
 - **AttackView:** [Added] Add local filter system.
 - **AttackView:** [Added] Add sort system.
 - **AttackView:** [Fixed] Arrival time showing a different format when the window is opened.
 - **Minimap:** [Added] Allow edition of existing highlights.
 - **Minimap:** [Added] Easy add highligh by right clicking the hover village.
 - **Minimap:** [Added] Make the highlights name/icon a hotlink to the item profile.
 - **Minimap:** [Fixed] Make the highlights name/icon a hotlink to the item profile.
 - **AutoCollector:** [Fixed] Collector trying to finish job when the initial villages is not ready yet.
 - **CommandQueue:** [Added] Button to clear unit/officer inputs.
 - **CommandQueue:** [Added] Option to choose and insert army preset to the unit/officer inputs.
 - **CommandQueue:** [Fixed] Travel times table not showing stripped td colors.
 - **CommandQueue:** [Fixed] Tooltip not hiding when removing waiting commands.

## 1.0.6

*10/06/2018*

 - **BuilderQueue:** [Added] Automatic build system (BuilderQueue).
 - **AttackView:** [Fixed] Backtime copy command.
 - **Minimap:** [Fixed] Working for players without tribe.
 - **Minimap:** [Updated] Increased load map area when moving by clicking the minimap.
 - **AutoCollector:** [Fixed] Second Village collector refactor, no more error notifications.
 - **CommandQueue:** [Fixed] Sent/not sent command notifications working as expected.
 - **CommandQueue:** [Fixed] Commands using * as unit amounts no longer try to send when there are no units avaiable.
 - **CommandQueue:** [Removed] Quick view when hovering the opener button.
 - **FarmOverflow:** [Updated] Forced minimum interval between attacks.
 - **FarmOverflow:** [Fixed] Sending two attacks at the same time on continuous mode.
 - **FarmOverflow:** [Fixed] Some translation keys.
 - **FarmOverflow:** [Removed] Quick view when hovering the opener button.

## 1.0.5

*05/06/2018*

 - **AttackView:** [Added] Incoming commands overview system (AttackView).
 - **Minimap:** [Added] Cache to draw villages from previously loaded maps.
 - **Minimap:** [Fixed] Tooltip not hiding when mouse leave the minimap container.
 - **Minimap:** [Fixed] Minimap size on different monitor sizes.
 - **Minimap:** [Fixed] Minimap don't keep draggin after mouse leave the minimap container.
 - **Minimap:** [Updated] Color picker palette colors changed.
 - **Minimap:** [Added] Color indicator of the current selected color.
 - **Minimap:** [Fixed] Hovering villages on minimap are more precise with the mouse cursor.
 - **Minimap:** [Updated] Removed overlay cache.
 - **CommandQueue:** [Fixed] Units input background base64 image.
 - **CommandQueue:** [Fixed] Attack commands with catapults being added without a building target (via headless CommandQueue).

## 1.0.4

*31/05/2018*

 - **Minimap:** [Added] Minimap system.
 - **AutoCollector:** [Updated] Renamed to AutoCollector.
 - **AutoCollector:** [Fixed] No more error notifications while active.
 - **AutoCollector:** [Added] Persistent mode, will keep activated after reloading the page.
 - **CommandQueue:** [Updated] Open Button text changed to "Commander"
 - **CommandQueue:** [Added] Origin/target villages can be selected via search by name.
 - **CommandQueue:** [Fixed] Command icons size on Firefox.
 - **CommandQueue:** [Fixed] Officers not being used when calculating travel times.
 - **CommandQueue:** [Fixed] Relocate commands on Waiting Commands tab showing the support icon.
 - **CommandQueue:** [Updated] Add Commands tab redesigned, more compact.
 - **CommandQueue:** [Updated] Keept only analytics about commands.
 - **FarmOverflow:** [Updated] Open Button text changed to "Farmer"
 - **FarmOverflow:** [Removed] Info Tab, infomations are now available only via wiki.
 - **FarmOverflow:** [Fixed] Ignore Full Storage setting now works as expected.
 - **FarmOverflow:** [Fixed] Incoming attacks are not counted as own commands anymore.
 - **FarmOverflow:** [Fixed] Recruited or added troops via items are now detected.
 - **FarmOverflow:** [Fixed] Creating new presets already selected by the farm (while running) are now properly detected.
 - **FarmOverflow:** [Fixed] Group selecting options display "Disabled" properly after manually disabling it.
 - **FarmOverflow:** [Fixed] Setting Commands Limit are now detected when changed while the farm is running.
 - **FarmOverflow:** [Fixed] Step Cycle running twice in some cases.

## 1.0.3

*30/04/2018*

 - **CommandQueue:** [Fixed] Waiting commands shows the corrct send/arrival datetime.
 - **CommandQueue:** [Fixed] Scrollbar no longer start in the tabs area.
 - **CommandQueue:** [Fixed] Translation texts.
 - **FarmOverflow:** [Added] Periodically reload targets information to check conquered villages.
 - **FarmOverflow:** [Fixed] Scrollbar no longer start in the tabs area.
 - **FarmOverflow:** [Fixed] Icons size on Firefox.
 - **FarmOverflow:** [Fixed] Translation texts.

## 1.0.2

*02/02/2018*

 - **CommandQueue:** [Fixed] Catapults not hiting the selected building.

## 1.0.0

*09/10/2017*

 - Initial release
