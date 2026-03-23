# AGENT.md

## Project name

MEP / GamePanel — browser-injected control panel and site extension module for casino game pages, primarily for `crash`.

## Purpose

This project is a browser-side control panel and statistics tracker that is injected into a live game page.

The script is not a backend service and not a standalone web app.  
It runs directly in the page context, hooks live page data, renders a fixed right-side panel, tracks recent game results, builds statistics, shows graphs, plays sounds on threshold hits, and can sync data/settings to a remote PHP endpoint.

The current primary supported game is `crash`. Support for other games is controlled through a registry of game slugs in settings.

---
## Core files

The main working files of the site extension / injected panel are:

- `crash.js` — the primary runtime script.
- `crash.css` — the primary stylesheet for the panel UI.

These two files are the core entry files for the current project version.

### `crash.js`
Contains the main runtime logic of the project, including:

- `window.MEP` namespace
- boot process via `MEP.Main.boot()`
- WebSocket interception
- DOM tracking
- state management
- history loading
- graph rendering
- diff graph rendering
- sound handling
- backend sync
- settings UI and persistence
- live panel rendering

### `crash.css`
Contains the full visual styling of the injected interface, including:

- fixed right-side control panel layout
- header and body styling
- tracking table styling
- graph and diff-graph styling
- tooltip styling
- modal window styling
- buttons, toggles, inputs
- responsive and overlay behavior

Do not rename, split, or replace these files casually unless the entire load/injection flow is updated consistently.


# What this script does

At runtime, the script:

1. Hooks `window.WebSocket` and inspects incoming messages.
2. Extracts game-related live data from WebSocket payloads.
3. Tracks current round-like identifiers and round boundaries.
4. Injects a fixed right-side panel (`#mep-control-panel`) into the page.
5. Watches page DOM for new game result items.
6. Maintains an internal history of results.
7. Shows:
   - raw statistics text
   - threshold tracking table
   - counts of streaks `<= X`
   - graph of recent multipliers
   - diff graph for `>= 2` versus `< 2`
8. Loads historical results from the site modal.
9. Saves local UI state to `localStorage` and cookie.
10. Sends live results and batch history to a backend endpoint.
11. Loads/saves panel settings to the backend.

---

# High-level architecture

All logic lives under the global namespace:

`window.MEP`

Main boot entry:

`MEP.Main.boot()`

The project is intentionally modular inside one large browser script.

Main modules:

- `MEP.Settings`
- `MEP.Storage`
- `MEP.HistoryLoader`
- `MEP.Config`
- `MEP.Style`
- `MEP.State`
- `MEP.Utils`
- `MEP.Net`
- `MEP.Sound`
- `MEP.Graph`
- `MEP.DiffGraph`
- `MEP.Sync`
- `MEP.UI`
- `MEP.Tracker`
- `MEP.Main`

Do not flatten this architecture further unless explicitly required.
Do not rename the public namespace MEP.

##  Runtime model

1. WebSocket hook layer

The script monkey-patches window.WebSocket and wraps:

addEventListener("message", ...)
onmessage = ...

This is used to inspect incoming messages without breaking the page’s native logic.

Responsibilities
preserve original socket behavior
parse JSON payloads safely
extract payload.data
detect:
crashMultiplier
crashGame
update:
MEP.WS.last.subId
MEP.WS.last.roundLikeId
MEP.WS.last.multiplier
MEP.WS.last.elapsed
MEP.WS.last.ts
dispatch browser events:
MEP:crashMultiplier
MEP:crashGame
Round linking

MEP.WSLink exists to correctly map result records to the finished round id, even when the live WebSocket id has already switched to the next round.

This logic is important for backend deduplication and correct event_key assignment.

Do not simplify it blindly.

2. Panel layer

The panel is injected as a fixed overlay on the right side of the screen.

Main root:

#mep-control-panel

The panel contains:

header with version, game name, counter, settings gear
collapsible history/statistics block
tracking table
diff graph section
>=2 / <2 stats section
main graph section
settings modal

This panel is not decorative.
It is the primary operator UI.

3. DOM tracking layer

The script watches the game’s “past bets / results” DOM block and treats it as the source of visible recent results.

Configured selectors:

#main-content div.past-bets
#main-content div.past-bets.svelte-3cv27h
Responsibilities
detect new result nodes
parse multiplier text
parse result status from button classes
maintain internal newest-first result list
reconcile missed results after pauses/history loading
Important invariant

MEP.State.list stores values in newest-first order.

A lot of logic depends on this.

Do not accidentally reverse storage order globally.

4. History loading layer

The script can open the site’s results history modal and walk paginated history pages.

It:

clicks the history button in page UI
waits for modal/table
parses rows from modal table
iterates pagination
appends history into internal state
temporarily stops live tracker during load
restarts tracker after load
Important behavior
repeated click while loading = abort
tracker is intentionally paused during history import
imported history is deduplicated by row key

Do not remove these protections.

5. Statistics layer

The script computes several operator-facing statistics.

A. Raw result list

Text area displays the tracked results.

B. Threshold tracking table

Each row tracks:

color
X threshold
streak count Подряд <= X
alert limit
sound key

The table is dynamic and can have variable number of rows.

C. >= 2 vs < 2

The script computes:

count of values >= 2
count of values < 2
percentages
difference between them
D. Diff history

The script stores cumulative diff history and displays it in a separate graph.

E. Main graph

The script renders recent multiplier values as SVG bars, with:

clipping by graph max
configurable density
optional horizontal threshold line

## State model
Core state

MEP.State contains the live mutable state.

Key fields include:

map
list
maxItems
graphMax
graphDensity
graphLine
lastAddedKey
initialLoaded
track
trackCount
soundFired
warnFired
historySteps
historyLoading
historyAbort
diffHistory
diffFullHistory
diffDensity
diffDensityManual
diffDensitySync
diffPosLevel
diffNegLevel
gameSlug
gameName
gameSupported
Tracking row format

Current expected tracking row shape:

{
  x: number,
  color: string,
  limit: number,
  soundKey: string
}

Legacy migration exists for older formats, including:

plain number rows
boolean sound

Preserve backward compatibility unless the migration is intentionally removed everywhere.

##  Data flow
Live round flow
WebSocket message arrives.
WebSocket hook extracts live identifiers and current multiplier metadata.
DOM tracker notices a new visible result in the result strip.
Parsed result is added to MEP.State.list.
UI is rerendered.
Tracking thresholds are recalculated.
Sound may fire.
The live entry may be posted to backend.
History flow
User clicks “Загрузить с истории”.
Script opens history modal.
Tracker is paused.
Rows are read page by page.
Values are merged into local state.
UI rerenders.
Tracker restarts.
Settings flow
Settings modal opens.
Current settings are shown.
User edits values.
Settings are saved locally.
Settings can also be synced to backend.
Sounds are rebuilt after changes.

## Backend interaction

This script can talk to a remote PHP endpoint over POST.

Expected operations
Ping
{ "action": "ping" }
Live/batch tracking
{ "action": "track", ... }
Save settings
{ "action": "settings_save", ... }
Load settings
{ "action": "settings_get", ... }
Networking rules

Use MEP.Net.postJson() for normal POST requests.

Fallback ping exists via Image() loading for hostile CSP/network cases.

Do not replace networking with random fetch calls scattered across modules.

## Persistence
Local persistence

Settings and UI state are persisted in:

localStorage
cookie
Settings key
mep_settings
Tracking/storage key
mep_tracking
Device id

A persistent generated device id is stored in local storage and used for settings sync.

## UI structure
Main blocks
Header

Contains:

version
game title
visible count
settings gear button
History block

Contains:

collapse/expand toggle
load history button
history steps input
statistics textarea
copy button
send-to-DB button
Tracking block

Contains dynamic table:

row index
color
X
streak
threshold
sound
Diff graph block

Contains:

positive and negative guide levels
min/max/len labels
SVG diff graph
>=2 / <2 block

Contains:

sample size input
“all history” checkbox
density input
sync checkbox
total count and diff
two horizontal bars
Main graph block

Contains:

graph max
graph density
horizontal line value
SVG graph
hover tooltip
Settings modal

Contains:

endpoint input
sounds multiline map key=url
default sound selector
hit flash duration
history pagination delay
sound priority mode
supported games registry
test buttons
load/save/cancel buttons

## CSS expectations

The panel is intentionally dark, fixed, overlayed, and operator-focused.

Key UI classes include:

.mep-header
.mep-body
.mep-track-wrap
.mep-track-table
.mep-history-toggle
.mep-actions-row
.mep-diff-wrap
.mep-two-stat-wrap
.mep-graph-wrap
.mep-modal-overlay
.mep-modal

Do not redesign the UI into a generic dashboard framework.
This tool is a compact utility overlay, not a marketing page.

## Supported games

Default config supports:

["crash"]

But the real supported game list can be overridden from settings via a newline-separated slug registry.

Game slug is extracted from URL path:

/casino/games/<slug>

If current game is unsupported, the panel still mounts but shows a “logic in development” placeholder instead of enabling tracking logic.

That behavior is intentional.

##  Important invariants
Must preserve
window.MEP as public namespace
MEP.Main.boot() as startup
WebSocket hook behavior without breaking native page sockets
newest-first storage in MEP.State.list
tracker pause during history loading
live dedup behavior in backend sync
support for legacy tracking row migration
settings sync/load behavior
SVG-based graph rendering
unsupported-game safe mode
Must not do
Do not rewrite the project into React/Vue.
Do not move logic to a backend.
Do not remove global MEP.
Do not replace page-context execution with isolated extension-context assumptions.
Do not remove DOM-based fallback tracking just because WebSocket exists.
Do not delete compatibility migrations unless all related old state formats are intentionally retired.
Do not remove comments unless explicitly asked.
Do not rename CSS classes casually.

## Development rules for Codex / agent

When working on this repo, follow these rules strictly.

1. Keep changes surgical

Prefer minimal, local patches.
Avoid broad rewrites.

2. Respect module boundaries

If the issue is in graph rendering, patch graph logic first.
If the issue is in history import, patch MEP.HistoryLoader first.
Do not mix unrelated refactors into bugfixes.

3. Preserve behavior before improving architecture

This project is heavily behavior-driven.
Working operator behavior is more important than “clean architecture” refactors.

4. Backward compatibility matters

There is already migration logic for older saved settings/state.
Do not break old localStorage payloads casually.

5. Do not remove existing comments

Adding comments is allowed.
Deleting existing comments is not allowed unless explicitly requested.

6. Do not change naming style unnecessarily

Use the existing naming style:

MEP.ModuleName
concise handler names
explicit UI query names
direct procedural logic where appropriate
7. Keep browser compatibility practical

This script runs in a real page environment.
Avoid adding tooling assumptions that require bundlers or transpilers unless asked.

8. Keep public API stable

Existing external console/debug usage through window.MEP and MEP.tracker should continue to work.

## Known behavior patterns

Deduplication

Live DB sync uses a dedup strategy based on:

event_key
gameId
lastSentKey
localStorage inter-tab lock

Be careful when modifying sync logic.

Tracker reconciliation

If some rounds are missed, tracker compares recent DOM window and patches missing entries.

This prevents gaps after pauses/history loading.

Sound priority

If multiple tracking rows trigger simultaneously, winner selection depends on settings:

high = bigger X has priority
low = smaller X has priority

This is not random.
Do not replace with “first match wins”.

Hit flash duration

Row highlight duration is tied to configured flash duration and can also respect actual audio length.

## Safe change checklist

Before finalizing any change, verify:

Panel still mounts.
Unsupported games still show safe placeholder.
Live results still append correctly.
History loading still works.
Tracking streak counts still update.
Sounds still work and do not spam infinitely.
Main graph still shows correct bars.
Diff graph still respects density and sign coloring.
Settings modal still opens and saves.
Backend sync payloads are still shaped correctly.

## Preferred task strategy

When implementing a change:

Identify the exact module responsible.
Patch the smallest possible area.
Preserve existing state shape if possible.
Keep UI selectors stable.
Re-run mental flow:
boot
mount
bind
live result arrives
render
sync

## Good task examples
fix tooltip positioning in diff graph
fix density sync between graphs
fix incorrect sign coloring in diff graph
fix duplicate live DB submission
add a new settings field without breaking old settings
add a new supported game slug flow
improve modal load timing without breaking tracker pause/resume
fix row highlight timing for audio playback

## Bad task examples
rewrite everything into a framework
replace all modules with classes
remove WebSocket hook because “DOM is enough”
remove DOM tracker because “WebSocket is enough”
convert state shape without migration
redesign UI completely during a small bugfix task


## Diff graph guide levels (+ / -)

The diff graph supports two operator-controlled horizontal dashed guide lines:

- positive guide level (`+`)
- negative guide level (`-`)

These inputs are part of the diff graph header UI and are used to place visual reference lines inside the SVG diff graph.

### Purpose

This feature lets the operator manually define two visual levels:

- a positive level in the upper half of the diff graph
- a negative level in the lower half of the diff graph

These are not auto-calculated thresholds.
They are manual UI-driven guide markers for visual analysis of the diff series.

### State fields

The feature uses these state fields:

- `MEP.State.diffPosLevel`
- `MEP.State.diffNegLevel`

Expected type:

- non-negative integer
- `0` means "disabled / not drawn"

These values must be persisted together with other panel settings/state.

### UI bindings

Expected UI fields:

- `ui.diffPosInput` or the current canonical selector-bound positive input
- `ui.diffNegInput` or the current canonical selector-bound negative input

Important:
the names used in `mount()`, `bind()`, UI apply functions, and render logic must stay consistent.

If the mount layer stores references under one name and the bind/apply layer reads another name, the inputs will appear in UI but will not update state, and the guide lines will not render.

### Render behavior

Guide lines are rendered inside `MEP.DiffGraph.render()`.

Rules:

1. The zero axis remains the center line.
2. Positive guide line is drawn above the center.
3. Negative guide line is drawn below the center.
4. Both lines are SVG `<line>` elements.
5. Lines are dashed.
6. Lines must ignore pointer events.
7. Lines should be rendered after bars if bar overlap can hide them.

Expected scaling model:

- use diff graph absolute max (`maxAbs`) as the scale basis
- center line = zero
- positive Y = `midY - (posLevel / maxAbsSafe) * (midY - 1)`
- negative Y = `midY + (negLevel / maxAbsSafe) * (midY - 1)`

Use a safe divisor:

- `maxAbsSafe = maxAbs > 0 ? maxAbs : 1`

### SVG expectations

Recommended attributes for each guide line:

- `x1 = 0`
- `x2 = full SVG width`
- `stroke-dasharray = "3 3"` or close equivalent
- `stroke-width` thin but visible
- `pointer-events = none`

Recommended CSS / class naming:

- `.mep-diff-lvl-pos`
- `.mep-diff-lvl-neg`

Do not convert this feature into HTML overlays.
It belongs in the SVG render layer.

### Input behavior

On input change:

1. read numeric value
2. clamp to integer `>= 0`
3. write normalized value back to input
4. update `MEP.State.diffPosLevel` or `MEP.State.diffNegLevel`
5. save via storage
6. rerender diff graph immediately

Expected behavior:
changing `+` or `-` must visually update the dashed line without page reload.

### Persistence requirements

The following must stay synchronized across:

- default state
- save payload
- load payload
- migration / backward compatibility logic if applicable
- UI apply function

If the field exists only in render logic but is not persisted or restored, the feature will behave inconsistently after reload.

### Failure mode to remember

A known class of bug for this feature is:

- inputs exist visually
- render code for dashed guide lines exists
- but UI references are mismatched between `mount()` and `bind()/apply()`

Typical result:
`diffPosLevel` and `diffNegLevel` remain `0`, so lines never appear even though the SVG render code is correct.

When debugging this feature, always verify:
- the input reference names match
- state values actually change from UI input
- rerender is called
- `maxAbs` is valid
- the generated SVG lines are appended to `ui.diffSvg`

### Safe change rules

When modifying this block:

- keep changes local to diff graph UI / state / render
- do not refactor unrelated graph code
- do not break density logic
- do not break tooltip logic
- do not remove zero axis
- do not replace SVG lines with CSS pseudo-elements
- do not remove persistence for `diffPosLevel` and `diffNegLevel`

### Minimum verification checklist

After any change, verify:

- entering `+3` draws a dashed line in the positive zone
- entering `-` value such as `4` draws a dashed line in the negative zone
- setting value to `0` hides the corresponding line
- reload preserves values if persistence is enabled
- tooltip behavior still works
- bar rendering still works
- density changes do not break guide line positioning


## File expectations

Primary runtime files:

- `crash.js` — main logic of the extension / injected game panel
- `crash.css` — main styles of the extension / injected game panel

Typical expectations:

- `crash.js` contains all core runtime modules and boot logic
- `crash.css` contains all panel, graph, modal, tooltip, and table styles
- version strings may need manual bumping when release-ready

These two files are considered the main files of the project.
Do not rename them unless all related injection/loading references are updated too.

Do not split files just for style unless requested.

## Debugging notes

Useful debug areas:

window.MEP.WS.debug
console logs around sync
MEP.Storage.debug()
MEP.tracker.reloadFromDom()
MEP.tracker.clear()
MEP.tracker.forceTick()

When debugging, prefer temporary logs close to the affected module.

## Summary

This project is a live in-page game statistics control panel.

It combines:

WebSocket interception
DOM observation
operator UI overlay
local persistence
graph rendering
threshold alarms
history importing
backend synchronization

Treat it as a behavior-critical browser instrumentation tool.
Optimize for reliability, small safe patches, and preserving operator workflow.