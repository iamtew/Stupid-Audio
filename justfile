# Stupid Audio catalog — copy plugin logos and demos from sibling checkouts.

set windows-shell := ["powershell.exe", "-NoLogo", "-Command"]

# Plugin checkouts: ~/src (HOME, else USERPROFILE). No username in this file.
src := env_var_or_default("HOME", env_var("USERPROFILE")) + "\\src"

default:
    @just --list

# Pull logos from ../TEW03 .. ../F4RT into assets/.
logos:
    Copy-Item ..\TEW03\assets\logo.png assets\tew03-icon.png -Force
    Copy-Item ..\K1X\assets\logo.png assets\k1x-logo.png -Force
    Copy-Item ..\5HKR\assets\logo.png assets\5hkr-logo.png -Force
    Copy-Item ..\V4JB\assets\logo.png assets\v4jb-logo.png -Force
    Copy-Item ..\F4RT\assets\logo.png assets\f4rt-logo.png -Force

# PNG → multi-size ICO for the browser tab. Needs ImageMagick (magick).
icon:
    magick assets/icon.png -define icon:auto-resize=256,128,64,48,32,16 assets/favicon.ico

# Pull each plugin's main docs shot into assets/. Sources live under ~/src.
screenshots:
    Copy-Item '{{src}}\TEW03\docs\screenshot1.png' assets\tew03-shot.png -Force
    Copy-Item '{{src}}\K1X\docs\screenshot1.png' assets\k1x-shot.png -Force
    Copy-Item '{{src}}\5HKR\docs\main.png' assets\5hkr-shot.png -Force
    Copy-Item '{{src}}\V4JB\docs\edit.png' assets\v4jb-shot.png -Force
    Copy-Item '{{src}}\F4RT\docs\play.png' assets\f4rt-shot.png -Force

# Pull website demo clips from each plugin's docs/ into assets/.
demos:
    Copy-Item ..\TEW03\docs\DEMO-B1-P2P4P7P10.ogg assets\DEMO-B1-P2P4P7P10.ogg -Force
    Copy-Item ..\TEW03\docs\DEMO-DELIGHTED-TEW03.ogg assets\DEMO-DELIGHTED-TEW03.ogg -Force
    Copy-Item ..\K1X\docs\K1X-DEMO1.mp3 assets\K1X-DEMO1.mp3 -Force
    Copy-Item ..\5HKR\docs\5HKR-DEMO1.mp3 assets\5HKR-DEMO1.mp3 -Force
    Copy-Item ..\V4JB\docs\V4JB-DEMO.ogg assets\V4JB-DEMO.ogg -Force
    Copy-Item ..\F4RT\docs\F4RT-DEMO1.mp3 assets\F4RT-DEMO1.mp3 -Force
