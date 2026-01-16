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

/**
 * Extract testCaseKey from DOM
 * Looks for <a> tag with href containing "/v2/testCase/{testCaseKey}"
 */
export function getTestCaseKeyFromDOM(): string | null {
	// Find all links that might contain test case key
	const links = document.querySelectorAll<HTMLAnchorElement>(
		'a[href*="/v2/testCase/"]',
	);

	for (const link of links) {
		const href = link.getAttribute("href");
		if (!href) continue;

		// Extract test case key from href
		// Example: #!/v2/testCase/PRJ-T1234
		const match = href.match(/\/v2\/testCase\/([A-Z]+-T\d+)/);
		if (match) {
			logger.debug("Found testCaseKey in DOM:", match[1]);
			return match[1];
		}
	}

	logger.error("testCaseKey not found in DOM");
	return null;
}
