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
 * Test Run Item with folder information
 */
export interface TestRunItem {
	id: number;
	testCaseKey: string;
	folderId: number | null;
}

/**
 * Get Test Run Items with folder IDs
 */
export async function getTestRunItems(
	testRunId: number,
	projectId: string,
	jwt: string,
): Promise<TestRunItem[]> {
	const fields = "id,index,$lastTestResult";
	const url = `${API_BASE_URL}/testrun/${testRunId}/testrunitems?fields=${encodeURIComponent(fields)}`;

	logger.debug("Fetching test run items:", url);

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

		if (!response.ok) {
			const errorText = await response.text();
			logger.error(
				"Failed to fetch test run items:",
				response.status,
				errorText,
			);
			return [];
		}

		const data = await response.json();
		logger.debug("Test run items data:", data);

		// Map to simplified structure
		return (data.testRunItems || []).map(
			(item: {
				id: number;
				$lastTestResult?: {
					testCase?: {
						key?: string;
						folderId?: number;
					};
				};
			}) => ({
				id: item.id,
				testCaseKey: item.$lastTestResult?.testCase?.key || "",
				folderId: item.$lastTestResult?.testCase?.folderId || null,
			}),
		);
	} catch (error) {
		logger.error("Error fetching test run items:", error);
		return [];
	}
}

/**
 * Folder tree node
 */
export interface FolderNode {
	id: number;
	name: string;
	parentId?: number;
	children: FolderNode[];
}

/**
 * Get Folder Tree for a project
 */
export async function getFolderTree(
	projectId: string,
	jwt: string,
): Promise<FolderNode[]> {
	const url = `${API_BASE_URL}/project/${projectId}/foldertree/testcase`;

	logger.debug("Fetching folder tree:", url);

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

		if (!response.ok) {
			const errorText = await response.text();
			logger.error("Failed to fetch folder tree:", response.status, errorText);
			return [];
		}

		const data = await response.json();
		logger.debug("Folder tree data:", data);

		return data.children || [];
	} catch (error) {
		logger.error("Error fetching folder tree:", error);
		return [];
	}
}

/**
 * Build a map of folderId -> folder path string
 */
export function buildFolderPathMap(
	folderTree: FolderNode[],
	parentPath = "",
): Map<number, string> {
	const pathMap = new Map<number, string>();

	for (const folder of folderTree) {
		const currentPath = parentPath
			? `${parentPath}/${folder.name}`
			: folder.name;
		pathMap.set(folder.id, currentPath);

		// Recursively process children
		if (folder.children && folder.children.length > 0) {
			const childPaths = buildFolderPathMap(folder.children, currentPath);
			for (const [id, path] of childPaths) {
				pathMap.set(id, path);
			}
		}
	}

	return pathMap;
}

/**
 * Find path from root to target folder
 * Returns array of folder IDs from root to target (inclusive)
 */
export function findPathToFolder(
	folderTree: FolderNode[],
	targetFolderId: number,
): number[] | null {
	function dfs(nodes: FolderNode[], path: number[]): number[] | null {
		for (const node of nodes) {
			const currentPath = [...path, node.id];

			if (node.id === targetFolderId) {
				return currentPath;
			}

			if (node.children && node.children.length > 0) {
				const result = dfs(node.children, currentPath);
				if (result) {
					return result;
				}
			}
		}
		return null;
	}

	return dfs(folderTree, []);
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
