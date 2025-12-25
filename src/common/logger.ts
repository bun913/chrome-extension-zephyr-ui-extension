/// <reference types="vite/client" />

/**
 * Simple logger that only outputs debug logs in development mode
 */
const isDev = import.meta.env.DEV;

export const logger = {
	/**
	 * Debug logs (only in development)
	 */
	debug: (...args: unknown[]) => {
		if (isDev) console.log(...args);
	},

	/**
	 * Info logs (always shown)
	 */
	info: (...args: unknown[]) => {
		console.log(...args);
	},

	/**
	 * Error logs (always shown)
	 */
	error: (...args: unknown[]) => {
		console.error(...args);
	},
};
