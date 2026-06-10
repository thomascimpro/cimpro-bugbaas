# Android Release Runbook

Praktische stappen om een nieuwe interne APK en GitHub Release snel te maken.

## Snelle releaseflow

1. Check status en laatste versie:

```powershell
git status --short
git tag --list "v*" --sort=-v:refname | Select-Object -First 5
```

2. Bump de patchversie overal:

```powershell
npm.cmd version 1.2.8 --no-git-tag-version
```

Pas daarna `app.json` en `android/app/build.gradle` aan, inclusief een hogere `versionCode`.

3. Voeg direct een korte `CHANGELOG.md` sectie toe en gebruik die later als GitHub release notes.

4. Run checks in deze vaste volgorde:

```powershell
npm.cmd run typecheck
.\android\gradlew.bat -p android :app:assembleRelease --no-daemon --console=plain
```

5. Controleer release signing tegen de bestaande install-base:

```powershell
& "$env:ANDROID_HOME\build-tools\36.0.0\apksigner.bat" verify --print-certs 'android\app\build\outputs\apk\release\app-release.apk'
```

Voor BugBaas is legacy/debug signing bewust de standaard, omdat de bestaande 1.x/2.x GitHub install-base die signing gebruikt. De DN mag dus `CN=Android Debug` zijn zolang de SHA-256 digest gelijk is aan de bestaande latest-compatible APK.

6. Vergelijk signing met de laatste GitHub APK voordat je publiceert:

```powershell
gh release download v1.2.7 --repo thomascimpro/cimpro-bugbaas --pattern "*.apk" --dir dist\compare
& "$env:ANDROID_HOME\build-tools\36.0.0\apksigner.bat" verify --print-certs dist\compare\Old.apk
& "$env:ANDROID_HOME\build-tools\36.0.0\apksigner.bat" verify --print-certs dist\AppName-1.2.8.apk
```

BugBaas release builds gebruiken standaard legacy signing. Dit is gelijkwaardig aan expliciet:

```powershell
.\android\gradlew.bat -p android :app:assembleRelease --no-daemon --console=plain
```

Gebruik geen upload-key APK voor GitHub releases zolang bestaande gebruikers op legacy/debug signing zitten. Een upload-key APK kan niet over een debug-key install heen zonder uninstall en geeft install-conflicts.

7. Kopieer de APK naar `dist`, controleer `aapt2 dump badging` en noteer de SHA256.

8. Stage alleen release-relevante runtime bestanden. Laat `tmp`, `screenshots`, losse bronafbeeldingen en previews buiten git.

9. Commit, tag, push en maak de GitHub Release met dezelfde changelogtekst.

Snelheidsafspraken:

- Gebruik `npm.cmd`, niet `npm`, zodat PowerShell policy geen vertraging geeft.
- Zet JDK 21 en Android SDK env vars voor de build in dezelfde shell.
- Start geen emulator als `adb devices` leeg is; vermeld dat kort als testbeperking.
- Controleer `master...origin/master` en bestaande tag voordat je commit/tag/push doet.

## Vereiste lokale setup

Gebruik Java 11 of hoger. Voor deze app werkte JDK 21 goed.

```powershell
$env:JAVA_HOME='C:\Program Files\Java\jdk-21'
$env:ANDROID_HOME='C:\Users\thoma.THOMAS\AppData\Local\Android\Sdk'
$env:ANDROID_SDK_ROOT=$env:ANDROID_HOME
$env:Path="$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"
```

Snelle check:

```powershell
java -version
adb devices
```

Let op:

- Als `java -version` Java 8 toont, faalt Gradle met Expo/React Native.
- Als `ANDROID_HOME` leeg is, vindt Gradle de Android SDK niet.
- Als `adb` niet gevonden wordt, staat `platform-tools` niet op `Path`.

## Versie ophogen

Pas dezelfde versie overal aan:

- `package.json`
- `package-lock.json`
- `app.json`
- `android/app/build.gradle`

In `android/app/build.gradle` moet ook `versionCode` omhoog.

Voorbeeld:

```gradle
versionCode 26
versionName "1.2.0"
```

## Changelog

Voeg bovenaan `CHANGELOG.md` een nieuwe sectie toe:

```markdown
## 1.2.0

- Korte omschrijving van de belangrijkste wijziging.
- Bugfixes of Android-specifieke verbeteringen.
- Eventuele gameplay/UI wijzigingen.
```

## Release notes beleid

Gebruik bij GitHub Releases altijd twee lagen:

1. Feature train summary: wat is nieuw sinds de minor feature release, bijvoorbeeld `2.1`.
2. Patch delta: wat is specifiek gefixt of toegevoegd in deze patch, bijvoorbeeld `2.1.19`.

Waarom: collega's die direct `2.1.19` downloaden moeten nog steeds zien wat de grote `2.1` feature was. Een patchrelease mag dus nooit alleen "bugfix" notes tonen als de gebruiker mogelijk vanaf een oudere minor of 1.x komt.

Template voor GitHub release notes:

```markdown
## Feature release 2.1: Bug Smash Duel en Bug Squad helpers

- Grote feature 1.
- Grote feature 2.
- Grote feature 3.

## Patch 2.1.19

- Specifieke wijziging in deze patch.
- Bugfix of Android-release detail.

## Installatie

- APK: `CimPro-BugBaas-2.1.19.apk`
- Package: `nl.cimpro.bugbaas`
- VersionCode: `90`
- SHA256: `...`
```

Regels:

- De titel blijft de exacte versie: `CimPro BugBaas 2.1.19`.
- De eerste sectie noemt de feature train, niet alleen de patch.
- Neem bij `2.1.x` minimaal Bug Smash Duel, training, helper bugs, Mythic specials, reward/XP-balans en Android install/signing mee als die relevant zijn.
- Zet pure bugfixes onder `Patch x.y.z`.
- Noteer altijd APK-bestandsnaam, package, versionCode en SHA256.
- Houd `CHANGELOG.md` chronologisch, maar GitHub release notes mogen feature train + patch combineren.

## Checks

```powershell
npm.cmd run typecheck
```

## Release APK bouwen

```powershell
cd android
$env:JAVA_HOME='C:\Program Files\Java\jdk-21'
$env:ANDROID_HOME='C:\Users\thoma.THOMAS\AppData\Local\Android\Sdk'
$env:ANDROID_SDK_ROOT=$env:ANDROID_HOME
$env:Path="$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"
.\gradlew.bat assembleRelease
cd ..
```

APK kopieren naar `dist`:

```powershell
Copy-Item -LiteralPath 'android\app\build\outputs\apk\release\app-release.apk' -Destination 'dist\CimPro-BugBaas-1.2.0.apk' -Force
```

Metadata en hash controleren:

```powershell
& "$env:ANDROID_HOME\build-tools\37.0.0\aapt2.exe" dump badging 'dist\CimPro-BugBaas-1.2.0.apk' | Select-String -Pattern 'package:'
Get-FileHash -Algorithm SHA256 -LiteralPath 'dist\CimPro-BugBaas-1.2.0.apk'
```

Controleer dat `versionCode` en `versionName` kloppen.

## Git commit en tag

Stage alleen release-relevante bestanden. Laat losse generated assets, screenshots en de `dist` map uit git, tenzij expliciet nodig.

```powershell
git fetch origin master --tags
git rev-list --left-right --count master...origin/master
git tag --list v1.2.0

git add -- CHANGELOG.md android/app/build.gradle app.json package-lock.json package.json src/components/ForegroundCatchBug.tsx src/components/WalkingBugsLayer.tsx
git commit -m "Release 1.2.0"
git tag -a v1.2.0 -m "CimPro BugBaas 1.2.0"
git push origin master
git push origin v1.2.0
```

## GitHub Release maken

```powershell
$notes = @'
## 1.2.0

- Release note 1.
- Release note 2.
- Release note 3.
'@

gh release create v1.2.0 'dist\CimPro-BugBaas-1.2.0.apk' --repo thomascimpro/cimpro-bugbaas --title 'CimPro BugBaas 1.2.0' --notes $notes --latest
```

Controle:

```powershell
gh release list --repo thomascimpro/cimpro-bugbaas --limit 3
gh release view v1.2.0 --repo thomascimpro/cimpro-bugbaas --json tagName,name,url,assets,publishedAt,targetCommitish
```

## Veelvoorkomende vertragingen

- PowerShell blokkeert `npm.ps1`: gebruik `npm.cmd run typecheck`.
- Java 8 staat eerder op `Path`: zet JDK 21 vooraan of stel `JAVA_HOME` expliciet in per build.
- Android SDK env vars ontbreken: zet `ANDROID_HOME` en `ANDROID_SDK_ROOT`.
- `gh release view --json isLatest` werkt niet: gebruik `gh release list` om `Latest` te controleren.

## Release signing

Release builds mogen niet met `android/app/debug.keystore` worden getekend. Gebruik lokaal:

```properties
# android/app/upload-keystore.properties
storeFile=bugbaas-upload.jks
storePassword=...
keyAlias=bugbaas-upload
keyPassword=...
```

Of zet dezelfde waarden via env vars:

```powershell
$env:BUGBAAS_UPLOAD_STORE_FILE='bugbaas-upload.jks'
$env:BUGBAAS_UPLOAD_STORE_PASSWORD='...'
$env:BUGBAAS_UPLOAD_KEY_ALIAS='bugbaas-upload'
$env:BUGBAAS_UPLOAD_KEY_PASSWORD='...'
```

`android/app/*.jks` en `android/app/upload-keystore.properties` blijven buiten git.
