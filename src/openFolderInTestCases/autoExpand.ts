import { logger } from "../common/logger";

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Decode Base64 encoded folder path
 */
function decodePathFromBase64(encoded: string): number[] {
	try {
		const decoded = atob(encoded);
		return decoded.split("-").map((id) => Number.parseInt(id, 10));
	} catch (error) {
		logger.error("Failed to decode path from Base64:", error);
		return [];
	}
}

/**
 * Wait for folder element (collapsed or expanded) to appear
 */
async function waitForFolderElement(
	folderId: number,
	maxRetries = 10,
): Promise<Element | null> {
	const selectors = [
		`[data-testid="folder-item-collapsed-${folderId}"]`,
		`[data-testid="folder-item-expanded-${folderId}"]`,
		`[data-folder-id="${folderId}"]`,
	];

	for (let retry = 0; retry < maxRetries; retry++) {
		for (const selector of selectors) {
			const element = document.querySelector(selector);
			if (element) {
				return element;
			}
		}
		await sleep(500);
	}
	return null;
}

/**
 * Expand a single folder by clicking its toggle button
 */
async function expandFolder(folderId: number): Promise<boolean> {
	// Check if folder is already expanded
	const expandedElement = document.querySelector(
		`[data-testid="folder-item-expanded-${folderId}"]`,
	);
	if (expandedElement) {
		logger.debug(`Folder ${folderId} is already expanded`);
		return true;
	}

	// Find the collapsed folder element
	const collapsedElement = document.querySelector(
		`[data-testid="folder-item-collapsed-${folderId}"]`,
	);

	if (!collapsedElement) {
		// Folder might be a leaf node (no children) or doesn't exist
		logger.debug(
			`No collapsed element for folder ${folderId}, might be leaf node`,
		);
		return true;
	}

	// Find the rotating chevron button inside
	const chevron = collapsedElement.querySelector(
		'[data-testid="rotating-chevron"]',
	);

	if (!chevron) {
		logger.debug(`No chevron found for folder ${folderId}`);
		return true;
	}

	// Click to expand
	logger.debug(`Expanding folder ${folderId}`);
	(chevron as HTMLElement).click();

	// Wait for children to load
	await sleep(300);
	return true;
}

/**
 * Find and click the folder name to select it
 */
function selectFolder(folderId: number): boolean {
	// Try to find the folder name element with data-folder-id
	const folderNameElement = document.querySelector(
		`[data-folder-id="${folderId}"]`,
	);

	if (folderNameElement) {
		logger.debug(`Clicking folder name element for ${folderId}`);
		(folderNameElement as HTMLElement).click();
		return true;
	}

	// Fallback: try clicking the expanded/collapsed container
	const expandedElement = document.querySelector(
		`[data-testid="folder-item-expanded-${folderId}"]`,
	);
	const collapsedElement = document.querySelector(
		`[data-testid="folder-item-collapsed-${folderId}"]`,
	);

	const container = expandedElement || collapsedElement;
	if (container) {
		// Try to find a clickable element inside
		const parent = container.closest("[data-folder-id]");
		if (parent) {
			logger.debug(`Clicking parent folder element for ${folderId}`);
			(parent as HTMLElement).click();
			return true;
		}
	}

	logger.error(`Could not find clickable element for folder ${folderId}`);
	return false;
}

/**
 * Expand folders sequentially along the path
 */
async function expandFoldersAlongPath(folderPath: number[]): Promise<boolean> {
	logger.info(`Expanding folder path: ${folderPath.join(" → ")}`);

	for (let i = 0; i < folderPath.length; i++) {
		const folderId = folderPath[i];
		const isLast = i === folderPath.length - 1;

		// Wait for folder element to appear
		const folderElement = await waitForFolderElement(folderId, 10);

		if (!folderElement) {
			logger.error(`Folder element not found after waiting: ${folderId}`);
			return false;
		}

		if (!isLast) {
			// Expand all folders except the last one
			const expanded = await expandFolder(folderId);
			if (!expanded) {
				logger.error(`Failed to expand folder: ${folderId}`);
				return false;
			}
			// Wait a bit for children to render
			await sleep(200);
		} else {
			// Click the last folder to select it
			logger.info(`Selecting target folder: ${folderId}`);
			selectFolder(folderId);
		}
	}

	return true;
}

/**
 * Wait for any folder element to appear (folder tree loaded)
 */
async function waitForFolderTreeLoaded(maxRetries = 20): Promise<boolean> {
	for (let retry = 0; retry < maxRetries; retry++) {
		const anyFolder = document.querySelector("[data-folder-id]");
		if (anyFolder) {
			return true;
		}
		await sleep(500);
	}
	return false;
}

/**
 * Check and auto-expand folder from URL parameters
 */
export async function checkAndAutoExpandFolder(): Promise<void> {
	const hash = window.location.hash;

	// Parse URL parameters
	const folderIdMatch = hash.match(/[#&]uiExtensionsFolderId=([^&]+)/);
	const pathMatch = hash.match(/[#&]p=([^&]+)/);

	if (!folderIdMatch) {
		logger.debug("No folder auto-expand parameters found");
		return;
	}

	const folderId = folderIdMatch[1];
	logger.info(`Auto-expanding folder ID: ${folderId}`);

	// Wait for folder tree to be loaded
	const treeLoaded = await waitForFolderTreeLoaded();
	if (!treeLoaded) {
		logger.error("Folder tree not loaded");
		return;
	}

	// If path is provided, use it
	if (pathMatch) {
		const encodedPath = pathMatch[1];
		const path = decodePathFromBase64(encodedPath);

		if (path.length > 0) {
			logger.info(`Using encoded path: ${path.join(" → ")}`);
			const success = await expandFoldersAlongPath(path);
			if (success) {
				logger.info("Folder expanded and selected successfully!");
			} else {
				logger.error("Failed to expand folder path");
			}
			return;
		}
	}

	// Fallback: just try to click the folder if it's visible
	logger.info("No path provided, trying to find folder directly");
	const targetFolderId = Number.parseInt(folderId, 10);
	const folderElement = await waitForFolderElement(targetFolderId, 5);
	if (folderElement) {
		selectFolder(targetFolderId);
	} else {
		logger.error("Folder not found and no path provided");
	}
}
