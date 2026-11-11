# Stupid Audio catalog — copy plugin logos and demos from sibling checkouts.

set windows-shell := ["powershell.exe", "-NoLogo", "-Command"]

# Plugin checkouts: ~/src (HOME, else USERPROFILE). No username in this file.
src := env_var_or_default("HOME", env_var("USERPROFILE")) + "\\src"

# Target list from `just --list`
default:
    @just --list

# Pull logos from ../TEW03 .. ../F4RT into img/.
logos:
    Copy-Item '{{src}}\TEW03\assets\logo.png' img\tew03-logo.png -Force
    Copy-Item '{{src}}\K1X\assets\logo.png' img\k1x-logo.png -Force
    Copy-Item '{{src}}\5HKR\assets\logo.png' img\5hkr-logo.png -Force
    Copy-Item '{{src}}\V4JB\assets\logo.png' img\v4jb-logo.png -Force
    Copy-Item '{{src}}\F4RT\assets\logo.png' img\f4rt-logo.png -Force

# assets/icon.png is the Affinity export. Source of truth. Never write that file.
# Derived: img/icon-{32,144,512}.png and img/favicon.ico. Needs ImageMagick (magick).
icon:
    Copy-Item assets/icon.png img/icon.png -Force
    magick assets/icon.png -background none -colorspace RGB -filter Lanczos +distort Resize 32x32 -colorspace sRGB PNG32:img/icon-32.png
    magick assets/icon.png -background none -colorspace RGB -filter Lanczos +distort Resize 144x144 -colorspace sRGB PNG32:img/icon-144.png
    magick assets/icon.png -background none -colorspace RGB -filter Lanczos +distort Resize 512x512 -colorspace sRGB PNG32:img/icon-512.png
    magick assets/favicon.png -background none -colorspace RGB -filter Lanczos -define icon:auto-resize=256,128,64,48,32,16 img/favicon.ico

# Convert PNG sources to 24-bit BMP files
wix-bitmaps:
    magick assets/installer-dialog.png -type TrueColor -alpha off BMP3:assets/installer-dialog.bmp
    magick assets/installer-banner.png -type TrueColor -alpha off BMP3:assets/installer-banner.bmp

# Copy graphics for the plugins Wix installers 
wix-copy:
    Copy-Item assets/installer-dialog.bmp '{{src}}\SNR3\installer\dialog.bmp' -Force
    Copy-Item assets/installer-banner.bmp '{{src}}\SNR3\installer\banner.bmp' -Force

# Pull each plugin's main docs shot into img/. Sources live under ~/src.
screenshots:
    Copy-Item '{{src}}\TEW03\docs\screenshot1.png' img\tew03-shot.png -Force
    Copy-Item '{{src}}\K1X\docs\screenshot1.png' img\k1x-shot.png -Force
    Copy-Item '{{src}}\5HKR\docs\main.png' img\5hkr-shot.png -Force
    Copy-Item '{{src}}\V4JB\docs\edit.png' img\v4jb-shot.png -Force
    Copy-Item '{{src}}\F4RT\docs\play.png' img\f4rt-shot.png -Force

# Move generated OG PNGs into each site's Pages tree. See og/justfile.
og-install:
    just -f og/justfile og-install

# Pull website demo clips from each plugin's docs/ into snd/.
demos:
    Copy-Item '{{src}}\TEW03\docs\DEMO-B1-P2P4P7P10.ogg' snd\DEMO-B1-P2P4P7P10.ogg -Force
    Copy-Item '{{src}}\TEW03\docs\DEMO-DELIGHTED-TEW03.ogg' snd\DEMO-DELIGHTED-TEW03.ogg -Force
    Copy-Item '{{src}}\K1X\docs\K1X-DEMO1.mp3' snd\K1X-DEMO1.mp3 -Force
    Copy-Item '{{src}}\5HKR\docs\5HKR-DEMO1.mp3' snd\5HKR-DEMO1.mp3 -Force
    Copy-Item '{{src}}\V4JB\docs\V4JB-DEMO.ogg' snd\V4JB-DEMO.ogg -Force
    Copy-Item '{{src}}\F4RT\docs\F4RT-DEMO1.mp3' snd\F4RT-DEMO1.mp3 -Force
