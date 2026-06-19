# Build APK Android cho LoveCheck

APK hiện tại là Capacitor WebView wrapper cho PWA, package id:

```text
games.babyress.checklove
```

PWA production build mặc định gọi API:

```text
https://api.checklove.babyress.games/api
```

## APK đã build sẵn local

File debug APK vừa build:

```text
D:\memory\check-in-luv\android\app\build\outputs\apk\debug\app-debug.apk
```

SHA256:

```text
3393B3DD1943172DD1EBDA43D9B07A88BC77C5112B93C64A01E4A1D3FFD6ECEB
```

Debug APK đã được ký bằng debug key, có thể cài thử trực tiếp trên Android sau khi bật Install unknown apps.

## Build lại APK

Yêu cầu:

- Node.js 22+
- Android SDK
- JDK từ Android Studio hoặc JDK tương thích Gradle/Android Gradle Plugin

Trên Windows máy này:

```powershell
$env:ANDROID_HOME="C:\AndroidSDK"
$env:ANDROID_SDK_ROOT="C:\AndroidSDK"
$env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"
npm install
npm run build:apk
```

Output:

```text
android\app\build\outputs\apk\debug\app-debug.apk
```

## Khi đổi UI/PWA

Sau khi sửa `apps/web`, chạy:

```powershell
$env:ANDROID_HOME="C:\AndroidSDK"
$env:ANDROID_SDK_ROOT="C:\AndroidSDK"
$env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"
npm run android:sync
npm run build:apk
```

`android:sync` sẽ:

1. Build PWA production.
2. Copy asset web vào Android.
3. Sinh lại icon/splash native từ `assets/brand/lovecheck-logo.svg`.

## Build release APK

Debug APK chỉ để test riêng. Nếu muốn gửi bản release ổn định:

1. Tạo keystore, không commit file này:

```powershell
keytool -genkeypair -v `
  -keystore lovecheck-release.jks `
  -alias lovecheck `
  -keyalg RSA `
  -keysize 2048 `
  -validity 10000
```

2. Build release unsigned:

```powershell
$env:ANDROID_HOME="C:\AndroidSDK"
$env:ANDROID_SDK_ROOT="C:\AndroidSDK"
$env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"
npm run android:sync
cd android
.\gradlew.bat assembleRelease
```

3. Ký APK:

```powershell
& "C:\AndroidSDK\build-tools\36.0.0\apksigner.bat" sign `
  --ks ..\lovecheck-release.jks `
  --ks-key-alias lovecheck `
  --out app-release-signed.apk `
  app\build\outputs\apk\release\app-release-unsigned.apk
```

4. Verify:

```powershell
& "C:\AndroidSDK\build-tools\36.0.0\apksigner.bat" verify --verbose app-release-signed.apk
```

Không commit `.jks`, `.keystore`, `.apk`, `.aab`, `.idsig` hoặc build output.

## Cài lên Android

Qua adb:

```powershell
& "C:\AndroidSDK\platform-tools\adb.exe" install -r android\app\build\outputs\apk\debug\app-debug.apk
```

Hoặc gửi APK sang máy Android, bật Install unknown apps rồi mở file.
