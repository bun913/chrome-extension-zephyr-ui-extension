import { logger } from "../common/logger";
import { checkAndAutoExpandFolder } from "./autoExpand";
import { addLinkButtonsToFolders } from "./linkButton";

/**
 * Initialize open folder in test cases feature
 */
export async function initOpenFolderFeature(): Promise<void> {
	logger.debug("Test Cases page detected!");

	// Check and auto-expand folder from URL parameters
	await checkAndAutoExpandFolder();

	// Add link buttons to all folders
	addLinkButtonsToFolders();

	// Re-add link buttons when DOM changes (new folders loaded)
	const observer = new MutationObserver(() => {
		addLinkButtonsToFolders();
	});

	if (document.body) {
		observer.observe(document.body, {
			childList: true,
			subtree: true,
		});
	}
}
