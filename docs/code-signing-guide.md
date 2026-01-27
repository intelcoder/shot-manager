# Code Signing & Notarization Guide

This guide covers the steps to sign and notarize Shot Manager for distribution on macOS and Windows.

## macOS Requirements

### 1. Apple Developer Account

- **Cost:** $99/year
- **Sign up:** https://developer.apple.com/programs/

### 2. Certificates Needed

| Certificate | Purpose |
|-------------|---------|
| Developer ID Application | Signs the .app bundle |
| Developer ID Installer | Signs the .pkg installer (optional) |

### 3. Setup Steps

#### Step 1: Create Certificates

1. Log in to https://developer.apple.com
2. Go to Certificates, Identifiers & Profiles
3. Click "+" to create a new certificate
4. Select "Developer ID Application"
5. Follow the CSR (Certificate Signing Request) process
6. Download and double-click to install in Keychain

#### Step 2: Create App-Specific Password

1. Go to https://appleid.apple.com
2. Sign in and go to Security > App-Specific Passwords
3. Generate a new password for "electron-notarize"
4. Save this password securely

#### Step 3: Environment Variables

Set these environment variables before building:

```bash
# For code signing (find name in Keychain Access)
export CSC_NAME="Developer ID Application: Your Name (TEAM_ID)"

# For notarization
export APPLE_ID="your-apple-id@email.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="XXXXXXXXXX"
```

To find your Team ID:
- Go to https://developer.apple.com/account
- Look under Membership Details

#### Step 4: Entitlements File

Create `entitlements.mac.plist` in project root:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    <key>com.apple.security.cs.disable-library-validation</key>
    <true/>
    <!-- Screen recording permission -->
    <key>com.apple.security.device.screen-capture</key>
    <true/>
    <!-- Microphone for video recording -->
    <key>com.apple.security.device.audio-input</key>
    <true/>
</dict>
</plist>
```

#### Step 5: Update electron-builder.yml

Add/update the mac section:

```yaml
mac:
  category: public.app-category.productivity
  icon: assets/icons/icon.icns
  hardenedRuntime: true
  gatekeeperAssess: false
  entitlements: entitlements.mac.plist
  entitlementsInherit: entitlements.mac.plist
  notarize: true
  target:
    - target: dmg
      arch:
        - x64
        - arm64
    - target: zip
      arch:
        - x64
        - arm64
```

### 4. Build Command

```bash
npm run package:mac
```

The build process will automatically:
1. Sign the app with your Developer ID
2. Submit to Apple for notarization
3. Staple the notarization ticket to the app

---

## Windows Requirements

### Code Signing Certificate

Without signing, Windows SmartScreen shows "Unknown publisher" warning.

| Option | Cost | Notes |
|--------|------|-------|
| EV Code Signing Certificate | ~$400/year | Instant SmartScreen trust |
| Standard Code Signing | ~$200/year | Builds trust over downloads |
| Self-signed | Free | Users see warnings |

**Certificate Providers:**
- DigiCert (https://digicert.com)
- Sectigo (https://sectigo.com)
- GlobalSign (https://globalsign.com)

### Setup Steps

#### Step 1: Purchase Certificate

1. Choose a provider and certificate type
2. Complete identity verification (can take days for EV certs)
3. Download the certificate as .pfx file

#### Step 2: Environment Variables

```bash
# Path to certificate file
export WIN_CSC_LINK="/path/to/certificate.pfx"

# Certificate password
export WIN_CSC_KEY_PASSWORD="your-certificate-password"
```

Or use certificate from Windows Certificate Store:

```bash
export WIN_CSC_NAME="Your Company Name"
```

#### Step 3: Update electron-builder.yml

```yaml
win:
  icon: assets/icons/icon.ico
  # Certificate file method
  certificateFile: ${env.WIN_CSC_LINK}
  certificatePassword: ${env.WIN_CSC_KEY_PASSWORD}
  # Or certificate store method
  # certificateSubjectName: "Your Company Name"
  target:
    - target: nsis
      arch:
        - x64
    - target: portable
      arch:
        - x64
```

### Build Command

```bash
npm run package:win
```

---

## GitHub Actions CI Setup

### Repository Secrets

Add these secrets in GitHub repository settings (Settings > Secrets and variables > Actions):

#### macOS Secrets

| Secret Name | Description |
|-------------|-------------|
| `CSC_LINK` | Base64-encoded .p12 certificate file |
| `CSC_KEY_PASSWORD` | Password for the .p12 certificate |
| `APPLE_ID` | Your Apple ID email |
| `APPLE_APP_SPECIFIC_PASSWORD` | App-specific password from Apple ID |
| `APPLE_TEAM_ID` | Your Apple Developer Team ID |

To base64 encode your certificate:
```bash
base64 -i certificate.p12 | pbcopy
```

#### Windows Secrets

| Secret Name | Description |
|-------------|-------------|
| `WIN_CSC_LINK` | Base64-encoded .pfx certificate file |
| `WIN_CSC_KEY_PASSWORD` | Password for the .pfx certificate |

### GitHub Actions Workflow

Create `.github/workflows/release.yml`:

```yaml
name: Build & Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build-mac:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build and sign
        env:
          CSC_LINK: ${{ secrets.CSC_LINK }}
          CSC_KEY_PASSWORD: ${{ secrets.CSC_KEY_PASSWORD }}
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_APP_SPECIFIC_PASSWORD: ${{ secrets.APPLE_APP_SPECIFIC_PASSWORD }}
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
        run: npm run package:mac

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: mac-installers
          path: |
            release/*.dmg
            release/*.zip

  build-windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build and sign
        env:
          WIN_CSC_LINK: ${{ secrets.WIN_CSC_LINK }}
          WIN_CSC_KEY_PASSWORD: ${{ secrets.WIN_CSC_KEY_PASSWORD }}
        run: npm run package:win

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: windows-installers
          path: |
            release/*.exe

  release:
    needs: [build-mac, build-windows]
    runs-on: ubuntu-latest
    steps:
      - name: Download all artifacts
        uses: actions/download-artifact@v4
        with:
          path: dist

      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          files: dist/**/*
          draft: true
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## Checklist

### Before First Release

- [ ] Apple Developer account created ($99/year)
- [ ] Developer ID Application certificate created and installed
- [ ] App-specific password generated
- [ ] `entitlements.mac.plist` created
- [ ] `electron-builder.yml` updated with entitlements and notarize options
- [ ] (Optional) Windows code signing certificate purchased

### For CI/CD

- [ ] All secrets added to GitHub repository
- [ ] `.github/workflows/release.yml` created
- [ ] Test build with a tag push

### Testing Locally

```bash
# Test macOS build (on Mac)
npm run package:mac

# Verify signature
codesign -dv --verbose=4 "release/mac/Shot Manager.app"

# Verify notarization
spctl -a -v "release/mac/Shot Manager.app"
```

---

## Troubleshooting

### "App is damaged and can't be opened"
- App wasn't signed or notarization failed
- Check that CSC_NAME matches your certificate exactly

### "Developer cannot be verified"
- Notarization didn't complete
- Run: `xcrun notarytool log <submission-id> --apple-id $APPLE_ID --team-id $APPLE_TEAM_ID`

### SmartScreen blocks Windows app
- App isn't signed, or using standard (non-EV) certificate
- EV certificates get immediate trust; standard certs need download reputation

### Notarization takes too long
- Apple's service can be slow (10-30 minutes)
- Check status at: https://developer.apple.com/system-status/
