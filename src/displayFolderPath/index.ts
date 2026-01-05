import { logger } from "../common/logger";
import { getJWT } from "../common/auth";
import { waitForElement } from "../common/dom";
import {
	extractTestCycleInfo,
	isTestCycleAddTestCasesPage,
} from "../common/url";
import {
	getTestRunId,
	getTestRunItems,
	getFolderTree,
	buildFolderPathMap,
} from "../common/api";

// Selector for the virtualized grid (not a real table)
const VIRTUALIZED_GRID_SELECTOR = "#virtualized-grid";

// Cache for folder path map (to avoid repeated API calls)
let folderPathMapCache: Map<number, string> | null = null;
let testRunItemsCache: Map<number, number | null> | null = null; // id -> folderId

/**
 * Add folder path to a grid row (append to Name cell)
 */
function addFolderPathToRow(
	row: HTMLElement,
	folderPathMap: Map<number, string>,
	testRunItemsMap: Map<number, number | null>,
): void {
	// Check if already processed
	if (row.querySelector(".folder-path-label")) {
		return;
	}

	// Get test run item ID from data-row-id attribute
	const dataRowId = row.getAttribute("data-row-id");
	if (!dataRowId) {
		return;
	}

	const testRunItemId = Number.parseInt(dataRowId, 10);
	const folderId = testRunItemsMap.get(testRunItemId);

	// Get folder path
	if (!folderId || !folderPathMap.has(folderId)) {
		return;
	}
	const folderPath = folderPathMap.get(folderId) || "";

	// Find the name cell
	const nameCell = row.querySelector('td[data-cell-id="name"]');
	if (!nameCell) {
		return;
	}

	// Create folder path label (inline after name, truncated)
	const folderPathLabel = document.createElement("span");
	folderPathLabel.className = "folder-path-label";
	folderPathLabel.style.cssText = `
		margin-left: 8px;
		font-size: 11px;
		color: #888;
	`;
	folderPathLabel.title = folderPath; // Full path on hover
	folderPathLabel.textContent = `(${folderPath})`;

	// Append to name cell
	nameCell.appendChild(folderPathLabel);
}

/**
 * Process all grid rows
 */
function processGridRows(
	folderPathMap: Map<number, string>,
	testRunItemsMap: Map<number, number | null>,
): void {
	const grid = document.querySelector(VIRTUALIZED_GRID_SELECTOR);
	if (!grid) {
		logger.debug("Virtualized grid not found");
		return;
	}

	// Process all rows (virtualized grid uses div.draggable-row)
	const rows = grid.querySelectorAll("div.draggable-row[data-row-id]");
	for (const row of rows) {
		addFolderPathToRow(row as HTMLElement, folderPathMap, testRunItemsMap);
	}

	logger.debug(`Processed ${rows.length} rows`);
}

/**
 * Initialize folder path display feature
 */
export async function initFolderPathFeature(): Promise<void> {
	logger.debug("Test Cycle Add Test Cases page detected!");

	// Wait for virtualized grid to be loaded
	logger.debug("Waiting for virtualized grid...");
	const grid = await waitForElement(VIRTUALIZED_GRID_SELECTOR);
	if (!grid) {
		logger.error("Virtualized grid not found");
		return;
	}
	logger.debug("Virtualized grid found!");

	// Extract URL info
	const urlInfo = extractTestCycleInfo();
	if (!urlInfo) {
		logger.error("Failed to extract URL info");
		return;
	}

	const { testRunKey, projectId } = urlInfo;
	logger.debug("Test Run Key:", testRunKey, "Project ID:", projectId);

	// Get JWT token
	const jwt = getJWT();
	if (!jwt) {
		logger.error("JWT token not found");
		return;
	}

	// Get test run ID
	const testRunId = await getTestRunId(testRunKey, projectId, jwt);
	if (!testRunId) {
		logger.error("Failed to get test run ID");
		return;
	}
	logger.debug("Test Run ID:", testRunId);

	// Fetch data in parallel
	const [testRunItems, folderTree] = await Promise.all([
		getTestRunItems(testRunId, projectId, jwt),
		getFolderTree(projectId, jwt),
	]);

	logger.debug("Test Run Items:", testRunItems.length);
	logger.debug("Folder Tree nodes:", folderTree.length);

	// Build maps
	testRunItemsCache = new Map(
		testRunItems.map((item) => [item.id, item.folderId]),
	);
	folderPathMapCache = buildFolderPathMap(folderTree);

	logger.debug("Folder Path Map size:", folderPathMapCache.size);

	// Process grid rows
	processGridRows(folderPathMapCache, testRunItemsCache);

	// Watch for DOM changes (new rows loaded)
	const observer = new MutationObserver(() => {
		if (!isTestCycleAddTestCasesPage()) {
			return;
		}
		if (folderPathMapCache && testRunItemsCache) {
			processGridRows(folderPathMapCache, testRunItemsCache);
		}
	});

	if (document.body) {
		observer.observe(document.body, {
			childList: true,
			subtree: true,
		});
	}
}
