import { logger } from "../common/logger";

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wait for element to appear in DOM (retry every 500ms)
 */
function waitForElement<T extends Element>(
	selector: string,
	maxRetries = 20,
): Promise<T | null> {
	return new Promise((resolve) => {
		// Check immediately
		const element = document.querySelector<T>(selector);
		if (element) {
			resolve(element);
			return;
		}

		// Retry every 500ms
		let retries = 0;
		const interval = setInterval(() => {
			const element = document.querySelector<T>(selector);
			if (element) {
				clearInterval(interval);
				resolve(element);
			} else {
				retries++;
				if (retries >= maxRetries) {
					clearInterval(interval);
					resolve(null);
				}
			}
		}, 500);
	});
}

/**
 * Open folder by search
 */
async function openFolderBySearch(
	folderName: string,
	folderId: string,
): Promise<void> {
	logger.debug(`Opening folder: ${folderName} (${folderId})`);

	// 1. Wait for search trigger button (max 3 seconds)
	logger.debug("Waiting for search trigger...");
	const searchTrigger = await waitForElement<HTMLButtonElement>(
		'[data-testid="ktm-search-trigger"] button',
		6, // 3 seconds
	);

	if (!searchTrigger) {
		logger.error("Search trigger not found");
		return;
	}

	// 2. Check if search is already open
	let searchInput = document.querySelector<HTMLInputElement>(
		'[data-testid="ktm-folder-tree-search-input"] input',
	);

	if (!searchInput) {
		// Open search
		logger.debug("Opening search...");
		searchTrigger.click();
		await sleep(300);

		// Wait for search input (max 2 seconds)
		searchInput = await waitForElement<HTMLInputElement>(
			'[data-testid="ktm-folder-tree-search-input"] input',
			4, // 2 seconds
		);
	}

	if (!searchInput) {
		logger.error("Search input not found");
		return;
	}

	logger.debug("Search input found!");

	// 2. Type folder name (React-compatible)
	logger.debug("Typing folder name...");
	searchInput.focus();

	// Set value using native setter for React compatibility
	const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
		window.HTMLInputElement.prototype,
		"value",
	)?.set;
	if (nativeInputValueSetter) {
		nativeInputValueSetter.call(searchInput, folderName);
	}

	searchInput.dispatchEvent(new Event("input", { bubbles: true }));
	searchInput.dispatchEvent(new Event("change", { bubbles: true }));

	logger.debug("Search input value:", searchInput.value);

	// Wait for search results
	logger.debug("Waiting for search results...");
	await sleep(1500);

	// 3. Click folder (select)
	logger.debug("Looking for folder...");
	const folder = document.querySelector(`[data-folder-id="${folderId}"]`);
	if (folder) {
		logger.debug("Found folder, clicking...");
		(folder as HTMLElement).click();
		await sleep(300);
	} else {
		logger.error("Folder not found");
		return;
	}

	// 4. Clear search (× button)
	logger.debug("Clearing search...");
	const cancelButton = document.querySelector<HTMLButtonElement>(
		'[data-testid="ktm-search-trigger"] button',
	);
	if (cancelButton) {
		cancelButton.click();
	}

	logger.info("Folder expanded and selected!");
}

/**
 * Check and auto-expand folder from URL parameters
 */
export async function checkAndAutoExpandFolder(): Promise<void> {
	const hash = window.location.hash;

	// Parse URL parameters: #uiExtensionsFolderName=Normal%20Login&uiExtensionsFolderId=25925605
	const folderNameMatch = hash.match(/#(?:.*&)?uiExtensionsFolderName=([^&]+)/);
	const folderIdMatch = hash.match(/#(?:.*&)?uiExtensionsFolderId=([^&]+)/);

	if (!folderNameMatch || !folderIdMatch) {
		logger.debug("No folder auto-expand parameters found");
		return;
	}

	const folderName = decodeURIComponent(folderNameMatch[1]);
	const folderId = folderIdMatch[1];

	logger.info(`Auto-expanding folder: ${folderName} (${folderId})`);

	await openFolderBySearch(folderName, folderId);
}
