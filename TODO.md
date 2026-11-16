# Stupid Audio TODO
Plugins with prefix lower case 'f' is effects, from FX.
When displaying the names, it should use the Florin sign.
That is U+0192 or &fnof;

Following plugins are still under development and shall not be included on main website.
- SNR3
- fN0B
- fR3Z0

## Add `just docs-screenshot` to all plugins
`TEW03` and `5HKR` have `just docs-screenshot` target and a script that will automatically take screenshots of the standalone debug build, for the docs website.
This needs to be implemented across the whole suite of plugins.

## Add `just install-debug` to all plugins
`5HKR` has `just install-debug`: build Debug, print that it overwrites the installed VST3, copy `Builds\VisualStudio2022\x64\Debug\VST3\<Name>.vst3` over `%ProgramFiles%\Common Files\VST3\<Name>.vst3`. Close the DAW first. If the shell is not admin, UAC via `Start-Process powershell -Verb RunAs` and `-EncodedCommand` (paths have spaces). Already-admin shells copy in-process. Copy the target from `5HKR/justfile` and swap the plugin name / bundle path. Same slot as the MSI, so it replaces Release until the MSI is run again.

## Unify plugin page order
The plugins have multiple pages, for various function.
A lot of pages are the same across the plugins, ie. Main, Effects, etc.
Make this order the same across plugins to keep consistency.

## TEW03 Sequencer sync
Currently TEW03 DAW sync seem to sync also position on grid into the sequencer.
This shall be known as "Grid Sync ON". 
Add a LED button, label "Grid Sync".
Default behavior should be just BPM sync, and when note plays the TEW03 sequencer starts from its beginning and plays until the note stops playing.

## TEW03 Note length
Remove 2x button LED from sequencer, replace with drop-down to select note length.
Lengths should be 32 (old 2x behavior), 16 (default), 8, and 4.
As it sounds, this should make the notes longer, keep the gate open longer. 
Not typical TB-303, but very typical TEW03!

## F4RT UI improvements
Right click to assign modulations + visual indicator on control when it's being modulated. 
See TEW03 for example of visual indication on controls when modulated.
Top tab-bar needs to be replaced with a page-selector like the other plugins, holding the pages.
Oscilators need to be better distinguished from each other.
The different controls and modulators need to be more clear where they go, how they're routed.
Must be a lot more clear how the envelopes and filters on Motion page maps.

# Completed, historical
Completed items below, keeping for now, will clean up later.

----

## 5HKR Polymeter bug
DONE: Lane loop wraps on the free-running 16th clock (`g % loop`) for the whole MIDI hold. No reset at 16 / 32 / 64. In `5HKR` sequencer + `just check`.
The polymeter function isn't working as intended. 
Example: Make a 2 bar long note in DAW, put a lane in 5HKR shorter than 16 steps (polymeter on).
Result: Polymeter loops correctly during the first bar, but when DAW hits second bar, the pattern begins from beginning. 
Expected behavior: Lane with shorter steps, polymeter on, should keep looping in those short steps. No reset.

## Direct download buttons
DONE: THIS ONE HAS BEEN COMPLETED WITH THE WEBSITE UPDATES RECENTLY
New plugin `SNR3` have on its docs website direct download buttons, by way of a GH action that writes a `releases.json` file wil filenames for the website.
Copy GH action and update docs website with new JS, copy from `SNR3` to other plugins.

## Stupid Audio website direct download buttons
DONE: Plugin Download opens the same overlay as the plugin sites, filled from that plugin's releases.json.
Implement the Download Overlay from plugin websites onto main Stupid Audio website also.

## Improve look and function of Manuals
DONE: THIS ONE HAS BEEN COMPLETED WITH THE WEBSITE UPDATES RECENTLY
Manuals are important, but have been an afterthought, they don't look good and is hard to read.
Come up with a good style, layout, function, based on JB2 and BS:
- https://iamtew.github.io/jb2/docs.html
- https://iamtew.github.io/borderstudio/docs.html

## MAYBE: Stupid Audio new website sections 
DONE: NOT ADDING ANY NEW SECTIONS AT THIS TIME. 



