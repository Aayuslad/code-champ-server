import util from "util";

type LogLevel = "debug" | "info" | "warn" | "error";

function format(message?: any, ...optionalParams: any[]) {
    if (optionalParams && optionalParams.length) {
        return util.format(message, ...optionalParams);
    }
    if (typeof message === "object") {
        try {
            return JSON.stringify(message);
        } catch {
            return String(message);
        }
    }
    return String(message ?? "");
}

function log(level: LogLevel, message?: any, ...optionalParams: any[]) {
    const time = new Date().toISOString();
    const formatted = format(message, ...optionalParams);
    const line = `[${time}] [${level.toUpperCase()}] ${formatted}`;
    switch (level) {
        case "debug":
            // eslint-disable-next-line no-console
            console.debug(line);
            break;
        case "info":
            // eslint-disable-next-line no-console
            console.info(line);
            break;
        case "warn":
            // eslint-disable-next-line no-console
            console.warn(line);
            break;
        case "error":
            // eslint-disable-next-line no-console
            console.error(line);
            break;
    }
}

export const logger = {
    debug: (message?: any, ...optionalParams: any[]) => log("debug", message, ...optionalParams),
    info: (message?: any, ...optionalParams: any[]) => log("info", message, ...optionalParams),
    warn: (message?: any, ...optionalParams: any[]) => log("warn", message, ...optionalParams),
    error: (message?: any, ...optionalParams: any[]) => log("error", message, ...optionalParams),
};

export default logger;


