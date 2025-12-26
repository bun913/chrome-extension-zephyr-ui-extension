import { logger } from "../common/logger";
import { fixFolderLabelCss } from "./fixFolderLabelCss";

/**
 * Initialize folder display improvements
 */
export function initFolderDisplayImprovements(): void {
	logger.debug("Initializing folder display improvements");

	// Fix existing folder labels
	fixFolderLabelCss();

	// Monitor for new folder labels (when scrolling or expanding folders)
	const observer = new MutationObserver(() => {
		fixFolderLabelCss();
	});

	if (document.body) {
		observer.observe(document.body, {
			childList: true,
			subtree: true,
		});
	}
}
