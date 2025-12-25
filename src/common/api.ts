import { API_BASE_URL } from "./constants";
import { logger } from "./logger";

/**
 * Get Test Run ID from test cycle key
 */
export async function getTestRunId(
	testCycleKey: string,
	projectId: string,
	jwt: string,
): Promise<number | null> {
	const url = `${API_BASE_URL}/testrun/${testCycleKey}?fields=id,key,name`;

	logger.debug("Fetching test run ID:", url);
	logger.debug("Project ID:", projectId);

	try {
		const response = await fetch(url, {
			method: "GET",
			headers: {
				Authorization: `JWT ${jwt}`,
				"Content-Type": "application/json",
				"jira-project-id": projectId,
			},
			credentials: "include",
		});

		logger.debug("Response status:", response.status, response.statusText);

		if (!response.ok) {
			const errorText = await response.text();
			logger.error("Failed to fetch test run ID:", response.status, errorText);
			return null;
		}

		const data = await response.json();
		logger.debug("Test run data:", data);

		return data.id;
	} catch (error) {
		logger.error("Error fetching test run ID:", error);
		return null;
	}
}

/**
 * Remove test run item (Pattern 1: Simplest)
 */
export async function removeTestRunItem(
	testRunId: number,
	testRunItemId: string,
	projectId: string,
	jwt: string,
): Promise<boolean> {
	const url = `${API_BASE_URL}/testrunitem/bulk/save`;

	const body = {
		deletedTestRunItems: [{ id: Number.parseInt(testRunItemId, 10) }],
		testRunId: testRunId,
	};

	logger.debug("Removing test run item:", body);

	try {
		const response = await fetch(url, {
			method: "PUT",
			headers: {
				Authorization: `JWT ${jwt}`,
				"Content-Type": "application/json",
				"jira-project-id": projectId,
			},
			credentials: "include",
			body: JSON.stringify(body),
		});

		logger.debug("Response status:", response.status, response.statusText);

		if (!response.ok) {
			const errorText = await response.text();
			logger.error(
				"Failed to remove test run item:",
				response.status,
				errorText,
			);
			return false;
		}

		logger.info("Test run item removed successfully!");
		return true;
	} catch (error) {
		logger.error("Error removing test run item:", error);
		return false;
	}
}
