# Executive ESH — Android APK

Ang app na ito ay bubukas ng link ng dashboard mo. Kapag nag-update ka ng dashboard sa GitHub, ito rin ang lalabas sa app. Hindi na kailangang gumawa ulit ng APK.

## Isang beses na setup
1. Ilagay ang folder na `apk` at ang folder na `.github` sa ugat (root) ng repo mo.
2. Sa GitHub: Settings > Secrets and variables > Actions > Variables > New repository variable.
   - Name: `APP_URL`
   - Value: ang buong https link ng executive-summary.html (halimbawa: `https://USERNAME.github.io/REPO/executive-summary.html`)
3. Tab na Actions > "Build Android APK" > Run workflow.

## Kunin ang APK
1. Actions > buksan ang pinakabagong run (berdeng check).
2. Sa ilalim, sa "Artifacts", i-download ang `SCIC-ESH-Executive-APK` (zip na may `SCIC-ESH-Executive.apk`).
3. Ipadala sa Android phone o tablet, buksan, at payagan ang "Install unknown apps".

## Palitan ang icon
Palitan ang `apk/assets/icon-only.png` ng 1024x1024 na PNG ng logo mo, tapos Run workflow ulit.

## Tandaan
- Debug-signed ang APK. Maganda para sa sariling gamit ng kompanya. Hindi ito para sa Play Store.
- Kailangan ng internet ang app, dahil live ang data mula sa Firebase.
- Kung magpapa-install ka ng bagong APK sa phone na may luma na, i-uninstall muna ang luma.
