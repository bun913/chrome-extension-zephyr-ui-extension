import { logger } from "./logger";

/**
 * Wait for element to be loaded (using MutationObserver)
 */
export function waitForElement(selector: string): Promise<Element> {
	return new Promise((resolve) => {
		logger.debug("Waiting for element:", selector);

		// Check if element already exists
		const element = document.querySelector(selector);
		if (element) {
			logger.debug("Element already exists!");
			resolve(element);
			return;
		}

		logger.debug("Starting MutationObserver...");

		// Monitor DOM changes with MutationObserver
		const observer = new MutationObserver(() => {
			const element = document.querySelector(selector);
			if (element) {
				logger.debug("Element found via MutationObserver!");
				observer.disconnect();
				resolve(element);
			}
		});

		if (!document.body) {
			logger.error("document.body does not exist!");
			return;
		}

		observer.observe(document.body, {
			childList: true,
			subtree: true,
		});

		logger.debug("MutationObserver is now observing...");
	});
}
