import { URL_PATTERNS } from "./constants";
import { logger } from "./logger";

/**
 * Check if current page is Test Runner page
 */
export function isTestRunnerPage(): boolean {
	const hash = window.location.hash;
	return hash.includes(URL_PATTERNS.TEST_PLAYER);
}

/**
 * Check if current page is Test Cases page
 */
export function isTestCasesPage(): boolean {
	const hash = window.location.hash;
	return hash.includes("/v2/testCases");
}

/**
 * Check if current page is Test Cycle Add Test Cases page
 * Example: #!/v2/testCycle/CPG-R2/addTestCases?assignedTestCaseId=...
 */
export function isTestCycleAddTestCasesPage(): boolean {
	const hash = window.location.hash;
	return (
		hash.includes(URL_PATTERNS.TEST_CYCLE_ADD_TEST_CASES) &&
		hash.includes("/addTestCases")
	);
}

/**
 * Extract information from URL
 */
export function extractUrlInfo(): {
	testCycleKey: string;
	assignedTestCaseId: string;
	projectKey: string;
	projectId: string;
} | null {
	const hash = window.location.hash;
	const href = window.location.href;

	// Extract test cycle key and assigned test case ID from hash
	// Example: #!/v2/testPlayer/{testCycleKey}?assignedTestCaseId={id}
	const hashMatch = hash.match(
		/\/v2\/testPlayer\/([^?]+)\?assignedTestCaseId=(\d+)/,
	);

	if (!hashMatch) {
		logger.error("Failed to extract URL info from hash:", hash);
		return null;
	}

	// Extract project key and project ID from query parameters
	const urlParams = new URLSearchParams(window.location.search);
	const projectKey = urlParams.get("projectKey");
	const projectId = urlParams.get("projectId");

	if (!projectKey || !projectId) {
		logger.error("Failed to extract project info from URL:", href);
		logger.debug("projectKey:", projectKey, "projectId:", projectId);
		return null;
	}

	return {
		testCycleKey: hashMatch[1],
		assignedTestCaseId: hashMatch[2],
		projectKey: projectKey,
		projectId: projectId,
	};
}

/**
 * Extract Test Cycle information from URL
 * Example: #!/v2/testCycle/CPG-R2/addTestCases?projectId=10000
 */
export function extractTestCycleInfo(): {
	testRunKey: string;
	projectId: string;
} | null {
	const hash = window.location.hash;

	// Extract test run key from hash
	// Example: #!/v2/testCycle/CPG-R2/addTestCases
	const hashMatch = hash.match(/\/v2\/testCycle\/([^/]+)\/addTestCases/);

	if (!hashMatch) {
		logger.error("Failed to extract test cycle info from hash:", hash);
		return null;
	}

	// Extract project ID from hash query parameters
	// Hash format: #!/v2/testCycle/CPG-R2/addTestCases?projectId=10000
	const hashQueryString = hash.split("?")[1] || "";
	const hashParams = new URLSearchParams(hashQueryString);
	let projectId = hashParams.get("projectId");

	// Fallback: try window.location.search (for iframe)
	if (!projectId) {
		const urlParams = new URLSearchParams(window.location.search);
		projectId = urlParams.get("projectId");
	}

	if (!projectId) {
		logger.error("Failed to extract projectId from URL");
		return null;
	}

	return {
		testRunKey: hashMatch[1],
		projectId: projectId,
	};
}
