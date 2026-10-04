[app]
title = App Quay So Ngau Nhien
package.name = appquayso
package.domain = org.gamequayso
source.dir = .
source.include_exts = py,png,jpg,kv,atlas
version = 1.0
requirements = python3==3.10.14, kivy==2.3.1
orientation = portrait
fullscreen = 1
android.permissions = INTERNET
android.api = 33
android.minapi = 21
android.archs = armeabi-v7a, arm64-v8a

[buildozer]
log_level = 2
warn_on_root = 1
