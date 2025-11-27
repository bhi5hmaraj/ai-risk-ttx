// Sentry instrumentation - must be imported first
const Sentry = require("@sentry/node");

Sentry.init({
    dsn: "https://a92ab31086021416feb2b21b72cafeda@o4510290979717120.ingest.de.sentry.io/4510435699523664",
    environment: process.env.NODE_ENV || "development",

    // Setting this option to true will send default PII data to Sentry
    // We set to false and manually control what context we send
    sendDefaultPii: false,

    // Sample rate for performance monitoring
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Add custom tags
    initialScope: {
        tags: {
            server: "colyseus",
        },
    },
});

module.exports = Sentry;
