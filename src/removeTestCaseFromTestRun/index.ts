import { logger } from "../common/logger";
import { addRemoveButton } from "./ui";
import { handleRemoveClick } from "./remove";

/**
 * Initialize remove test case feature
 */
export async function initRemoveTestCaseFeature(): Promise<void> {
	logger.debug("Test Runner page detected!");
	logger.debug("Current URL:", window.location.href);
	logger.debug("Hash:", window.location.hash);
	logger.debug("In iframe:", window !== window.top);
	logger.debug("document.body exists:", !!document.body);

	// Add remove button to UI
	await addRemoveButton(handleRemoveClick);
}
