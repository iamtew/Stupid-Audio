# Stupid Audio catalog — copy plugin logos and demos from sibling checkouts.

set windows-shell := ["powershell.exe", "-NoLogo", "-Command"]

default:
    @just --list

# Pull logos from ../TEW03 .. ../F4RT into assets/. TEW03 ships icon.png; the rest ship logo.png.
logos:
    Copy-Item ..\TEW03\assets\icon.png assets\tew03-icon.png -Force
    Copy-Item ..\K1X\assets\logo.png assets\k1x-logo.png -Force
    Copy-Item ..\5HKR\assets\logo.png assets\5hkr-logo.png -Force
    Copy-Item ..\V4JB\assets\logo.png assets\v4jb-logo.png -Force
    Copy-Item ..\F4RT\assets\logo.png assets\f4rt-logo.png -Force

# Pull website demo clips from each plugin's docs/ into assets/.
demos:
    Copy-Item ..\TEW03\docs\DEMO-B1-P2P4P7P10.ogg assets\DEMO-B1-P2P4P7P10.ogg -Force
    Copy-Item ..\TEW03\docs\DEMO-DELIGHTED-TEW03.ogg assets\DEMO-DELIGHTED-TEW03.ogg -Force
    Copy-Item ..\K1X\docs\K1X-DEMO1.mp3 assets\K1X-DEMO1.mp3 -Force
    Copy-Item ..\5HKR\docs\5HKR-DEMO1.mp3 assets\5HKR-DEMO1.mp3 -Force
    Copy-Item ..\V4JB\docs\V4JB-DEMO.ogg assets\V4JB-DEMO.ogg -Force
    Copy-Item ..\F4RT\docs\F4RT-DEMO1.mp3 assets\F4RT-DEMO1.mp3 -Force
