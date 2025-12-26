import { logger } from "../common/logger";

/**
 * Fix folder label CSS to allow text wrapping
 */
export function fixFolderLabelCss(): void {
	const groupLabels = document.querySelectorAll('[data-testid="group-label"]');

	logger.debug(`Found ${groupLabels.length} folder labels to fix`);

	for (const label of groupLabels) {
		// Check if already fixed
		if (label.hasAttribute("data-zephyr-ui-extension-css-fixed")) {
			continue;
		}

		// Fix parent div height (remove fixed height)
		// Use parentElement instead of class name for stability
		const parentDiv = label.parentElement;
		if (parentDiv) {
			(parentDiv as HTMLElement).style.height = "auto";
		}

		// Fix group-label span to allow wrapping
		(label as HTMLElement).style.maxWidth = "100%";
		(label as HTMLElement).style.overflow = "visible";

		// Fix text span white-space (allow wrapping)
		const textSpan = label.querySelector('div[role="presentation"] span');
		if (textSpan) {
			(textSpan as HTMLElement).style.whiteSpace = "normal";
			(textSpan as HTMLElement).style.wordBreak = "break-word";
			(textSpan as HTMLElement).style.maxWidth = "100%";
			(textSpan as HTMLElement).style.display = "inline-block";
		}

		// Mark as fixed (with extension prefix)
		label.setAttribute("data-zephyr-ui-extension-css-fixed", "true");

		logger.debug("Fixed folder label CSS");
	}
}
