// Zephyr UI Extension - Content Script
import { logger } from "./common/logger";
import { isTestRunnerPage, isTestCasesPage } from "./common/url";
import { initRemoveTestCaseFeature } from "./removeTestCaseFromTestRun";
import { initOpenFolderFeature } from "./openFolderInTestCases";

logger.info("Zephyr UI Extension loaded!");

/**
 * Main initialization
 */
function init() {
	if (isTestRunnerPage()) {
		initRemoveTestCaseFeature();
	} else if (isTestCasesPage()) {
		initOpenFolderFeature();
	} else {
		logger.debug("Not a supported page, extension will not activate");
	}
}

// Wait for DOM to be loaded
if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", init);
} else {
	init();
}

// Monitor URL changes (SPA navigation)
window.addEventListener("hashchange", () => {
	logger.debug("URL changed, checking if Test Runner page...");
	init();
});
