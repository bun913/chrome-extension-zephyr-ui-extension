import { logger } from "../common/logger";

/**
 * Fix folder label CSS to allow text wrapping
 */
export function fixFolderLabelCss(): void {
	const groupLabels = document.querySelectorAll('[data-testid="group-label"]');

	logger.debug(`Found ${groupLabels.length} folder labels to fix`);

	for (const label of groupLabels) {
		// Check if already fixed
		if (label.hasAttribute("data-css-fixed")) {
			continue;
		}

		// Fix parent div height (remove fixed height)
		const parentDiv = label.closest(".css-mx173x");
		if (parentDiv) {
			(parentDiv as HTMLElement).style.height = "auto";
		}

		// Fix text span white-space (allow wrapping)
		const textSpan = label.querySelector('div[role="presentation"] span');
		if (textSpan) {
			(textSpan as HTMLElement).style.whiteSpace = "normal";
		}

		// Mark as fixed
		label.setAttribute("data-css-fixed", "true");

		logger.debug("Fixed folder label CSS");
	}
}
