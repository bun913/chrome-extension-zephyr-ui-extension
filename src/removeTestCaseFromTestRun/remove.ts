import { getJWT } from "../common/auth";
import { getTestRunId, removeTestRunItem } from "../common/api";
import { extractUrlInfo } from "../common/url";
import { logger } from "../common/logger";

/**
 * Handle remove button click
 */
export async function handleRemoveClick(): Promise<void> {
	logger.debug("Remove button clicked!");

	// Extract URL information
	const urlInfo = extractUrlInfo();
	if (!urlInfo) {
		alert("Failed to extract URL info");
		return;
	}

	logger.debug("Extracted info:", urlInfo);

	// Get JWT token
	const jwt = getJWT();
	if (!jwt) {
		alert("JWT token not found in cookies");
		return;
	}

	logger.debug("JWT token found");

	// Get Test Run ID
	const testRunId = await getTestRunId(
		urlInfo.testCycleKey,
		urlInfo.projectId,
		jwt,
	);
	if (!testRunId) {
		alert("Failed to get test run ID");
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
		alert("Failed to remove test case from test cycle");
	}
}
