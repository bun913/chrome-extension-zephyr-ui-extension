import { refreshJWT } from "../common/auth";
import { getTestRunId, removeTestRunItem } from "../common/api";
import { extractUrlInfo } from "../common/url";
import { logger } from "../common/logger";
import { getTestCaseKeyFromDOM } from "../common/dom";

/**
 * Handle remove button click
 */
export async function handleRemoveClick(): Promise<void> {
	logger.debug("Remove button clicked!");

	// Extract URL information
	const urlInfo = extractUrlInfo();
	if (!urlInfo) {
		logger.error("Failed to extract URL info");
		alert("Failed to remove test case. Please refresh the page and try again.");
		return;
	}

	logger.debug("Extracted info:", urlInfo);

	// Get testCaseKey from DOM
	const testCaseKey = getTestCaseKeyFromDOM();
	if (!testCaseKey) {
		logger.error("Failed to get test case key from DOM");
		alert("Failed to remove test case. Please refresh the page and try again.");
		return;
	}

	logger.debug("Test case key:", testCaseKey);

	// Refresh JWT token before making API calls
	logger.debug("Refreshing JWT token...");
	const jwt = await refreshJWT(
		urlInfo.projectId,
		urlInfo.testCycleKey,
		testCaseKey,
	);

	if (!jwt) {
		logger.error("Failed to refresh JWT token");
		alert("Failed to remove test case. Please refresh the page and try again.");
		return;
	}

	logger.debug("JWT token refreshed successfully");

	// Get Test Run ID
	const testRunId = await getTestRunId(
		urlInfo.testCycleKey,
		urlInfo.projectId,
		jwt,
	);
	if (!testRunId) {
		logger.error("Failed to get test run ID");
		alert("Failed to remove test case. Please refresh the page and try again.");
		return;
	}

	logger.info("Test Run ID:", testRunId);

	// Remove test run item
	const success = await removeTestRunItem(
		testRunId,
		urlInfo.assignedTestCaseId,
		urlInfo.projectId,
		jwt,
	);

	if (success) {
		// Reload immediately without alert
		window.location.reload();
	} else {
		logger.error("Failed to remove test case from test cycle");
		alert("Failed to remove test case. Please refresh the page and try again.");
	}
}
