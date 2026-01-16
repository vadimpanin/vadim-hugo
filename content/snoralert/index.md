---
title: "Snoralert: Sleep Sound Detection using Machine Learning"
date: 2026-01-04
sidebar: false
---

# SnorAlert

**Sleep sound detection for iPhone & Apple Watch**

SnorAlert is a personal wellness app that uses on-device machine learning to detect snoring-like sounds in real time and optionally prompt you to adjust your position. All audio analysis happens on your device. SnorAlert does not upload audio clips or session logs to our servers.

**Wellness disclaimer:** SnorAlert is for informational and general wellness purposes only. It is not a medical device and does not diagnose, treat, cure, or prevent any condition. If you suspect sleep apnea or other sleep disorders, consult a qualified clinician.

## How It Works

1. **Real-time Detection**  
   SnorAlert listens through your iPhone’s microphone and analyzes audio using an on-device ML model trained to detect snoring-like sounds.

2. **Smart Alerts**  
   When snoring-like sounds are detected, the app can play an alert sound (with optional rotating frequencies to reduce habituation) and can trigger Apple Watch haptics to gently prompt you to reposition.

3. **Configurable Sensitivity**  
   Adjust the detection threshold, alert cooldown, and other settings to match your sleep environment and reduce false alarms.

## Key Features

- On-device ML snore detection (no internet required for detection)
- Apple Watch haptic notifications
- Rotating alert frequencies (optional)
- Noise reduction preprocessing to improve robustness in noisy environments
- Optional session logging and optional audio sample saving for personal review
- Fully configurable detection sensitivity and alert settings

## How to install

SnorAlert is currently available as a beta through Apple TestFlight.

[Install the app on your iPhone or iPad](https://testflight.apple.com/join/JjMdFcrN)

Apple Watch support included.

---

# Privacy Policy

**Last updated: January 4, 2026**

SnorAlert (“the App”) is developed as a personal wellness tool. Your privacy is important to us. This policy explains what data the App can collect, how it’s used, and your choices.

## Summary

- Audio is processed locally on your device
- Audio clips and session logs are never uploaded to our servers
- No analytics or advertising SDKs are used
- You control all optional data storage features

## Wellness Disclaimer

SnorAlert is not a medical device and does not provide medical advice or diagnosis. It is intended for general wellness and informational purposes only.

## Data the App Collects

### Microphone Audio

The App uses your device’s microphone to detect snoring-like sounds.

- **Processing:** Audio is processed in real time using an on-device machine learning model. Audio streams through a buffer, is analyzed, and is discarded after analysis.
- **Recording:** Audio is **not recorded or stored by default**. If you enable **Save Detected Audio** in Settings, short audio clips (3-second samples) may be saved locally when alerts trigger.
- **Uploading:** Audio is **not uploaded to our servers**. All analysis happens on your device.

### Session Data (Optional)

If you enable **Log Alerts** in Settings:

- **What’s stored:** Timestamps of when monitoring started/stopped and when alerts triggered, along with detection confidence scores.
- **Where it’s stored:** Text files in the App’s local Documents folder on your device only.
- **Format:** Daily log files named `YYYY-MM-DD.txt`.

### Saved Audio Samples (Optional)

If you enable **Save Detected Audio** in Settings:

- **What’s stored:** Short WAV audio clips captured when alerts trigger.
- **Where it’s stored:** The App’s local Documents folder, organized by date (`audio_YYYY-MM-DD/`).
- **Limits:** Maximum 100 samples per day. Old samples can be automatically cleaned up.

### User Preferences

Your settings (detection threshold, alert preferences, etc.) are stored locally using iOS UserDefaults. This data does not leave your device.

## How the App Uses Data

All collected data is used solely to:

- Detect snoring-like sounds and optionally trigger alerts during your sleep session
- Display session statistics and detection confidence scores
- Allow you to review past sessions and audio samples (if you enable these features)

## Data Sharing

**The App does not sell your data.**

SnorAlert:
- Does not include analytics SDKs
- Does not include advertising SDKs
- Does not include tracking SDKs

We do not operate any servers for SnorAlert, and the App does not transmit your audio clips or session logs to our servers.

## Apple Watch

If you use the companion Apple Watch app, SnorAlert uses Apple’s WatchConnectivity framework to communicate between your paired devices. SnorAlert does not send your audio clips or session logs to our servers.

## Reviewing and Accessing Your Data

Audio samples and log files are saved to the App’s Documents folder. To access them, connect your iPhone to a Mac, open Finder, select your device, and use the **Files** tab to download or delete them.

## Retention and Deletion

All data is stored locally on your device:

- **Log files:** Located in the App’s Documents folder. Delete individual files via Finder/iTunes File Sharing, or delete all data by deleting the App.
- **Audio samples:** Located in `audio_YYYY-MM-DD` folders. The App can automatically clean up samples older than 7 days (configurable). You can also delete manually via Finder/iTunes or by deleting the App.
- **Settings:** Stored in UserDefaults. Deleted when you delete the App, or reset using **Reset to Defaults** in Settings.

### How to Delete Your Data

1. **Delete specific files:** Connect your iPhone to a Mac, open Finder, select your iPhone, go to the **Files** tab, find SnorAlert, and drag files out or delete them.
2. **Delete all data:** Delete the SnorAlert app from your device. All associated data will be removed.
3. **Reset settings only:** Use the **Reset to Defaults** button in the App’s Settings.

## Your Choices

### Microphone Permission

- You can deny microphone permission; the App will not be able to detect snoring-like sounds.
- You can revoke permission at any time: **Settings > Privacy & Security > Microphone > SnorAlert**.

### Optional Features

All data storage features are optional and controlled in the App’s Settings:

- **Save Detected Audio:** Off by default. Enable to save audio samples when alerts trigger.
- **Log Alerts:** Enable to create daily text logs of alert events.

You can disable these features at any time to stop new data from being saved.

## Children’s Privacy

The App is not directed at children under 13. We do not knowingly collect personal information from children.

## Changes to This Policy

We may update this Privacy Policy from time to time. Changes will be reflected in the “Last updated” date at the top of this page.

## Contact

For privacy questions, concerns, or data deletion requests:

**Email:** [snoralert@vadim.ai]

---

*SnorAlert is designed with privacy as a core principle. Your sleep-related data belongs to you and stays on your device.*
