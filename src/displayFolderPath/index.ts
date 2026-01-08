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
	if (row.querySelector(".zephyr-extension-folder-path")) {
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

	// Create folder path label (on new line)
	const folderPathLabel = document.createElement("span");
	folderPathLabel.className = "zephyr-extension-folder-path";
	folderPathLabel.setAttribute("data-folder-path", folderPath);
	folderPathLabel.style.cssText = `
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 11px;
		color: #888;
		margin-top: 2px;
	`;
	folderPathLabel.title = folderPath; // Full path on hover

	// Add extension icon
	const icon = document.createElement("img");
	icon.src = chrome.runtime.getURL("icon.png");
	icon.style.cssText = `
		width: 12px;
		height: 12px;
		flex-shrink: 0;
	`;

	const text = document.createElement("span");
	text.textContent = folderPath;

	folderPathLabel.appendChild(icon);
	folderPathLabel.appendChild(text);

	// Append to name cell
	nameCell.appendChild(folderPathLabel);
}

// Maximum number of checkboxes to select
const MAX_SELECTION = 50;

// Counter for selected checkboxes (persists across button clicks)
let selectedCounter = 0;

/**
 * Add filter UI (input + button)
 */
function addFilterUI(): void {
	// Check if already added
	if (document.getElementById("zephyr-extension-folder-filter")) {
		return;
	}

	// Find the grid header using data-column-id attribute
	const headerColumn = document.querySelector("[data-column-id]");
	if (!headerColumn || !headerColumn.parentElement) {
		logger.debug("Grid header not found for filter UI");
		return;
	}
	const headerContainer = headerColumn.parentElement;

	// Create filter container
	const filterContainer = document.createElement("div");
	filterContainer.id = "zephyr-extension-folder-filter";
	filterContainer.style.cssText = `
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 0;
	`;

	// Add extension icon
	const icon = document.createElement("img");
	icon.src = chrome.runtime.getURL("icon.png");
	icon.style.cssText = `
		width: 16px;
		height: 16px;
	`;

	// Create label
	const label = document.createElement("span");
	label.textContent = "Select by folder:";
	label.style.cssText = `
		font-size: 12px;
		font-weight: 500;
		color: #333;
	`;

	// Create input
	const input = document.createElement("input");
	input.type = "text";
	input.id = "zephyr-extension-folder-filter-input";
	input.placeholder = "e.g. app1/general_user/login";
	input.style.cssText = `
		padding: 6px 12px;
		border: 1px solid #ddd;
		border-radius: 3px;
		font-size: 12px;
		width: 300px;
	`;

	// Create button
	const button = document.createElement("button");
	button.textContent = "Select Matching";
	button.style.cssText = `
		padding: 6px 12px;
		background-color: #0052cc;
		color: white;
		border: none;
		border-radius: 3px;
		font-size: 12px;
		cursor: pointer;
	`;
	button.addEventListener("click", handleFilterClick);
	button.addEventListener("mouseenter", () => {
		button.style.backgroundColor = "#0065ff";
	});
	button.addEventListener("mouseleave", () => {
		button.style.backgroundColor = "#0052cc";
	});

	// Create counter display
	const counter = document.createElement("span");
	counter.id = "zephyr-extension-selection-counter";
	counter.style.cssText = `
		font-size: 12px;
		color: #666;
	`;
	counter.textContent = `Selected: ${selectedCounter}/${MAX_SELECTION}`;

	filterContainer.appendChild(icon);
	filterContainer.appendChild(label);
	filterContainer.appendChild(input);
	filterContainer.appendChild(button);
	filterContainer.appendChild(counter);

	// Insert before the header container
	headerContainer.insertAdjacentElement("beforebegin", filterContainer);
	logger.debug("Filter UI added");

	// Listen for Delete button click to reset counter
	const deleteButton = document
		.querySelector(".delete-button-text")
		?.closest("button");
	if (deleteButton) {
		deleteButton.addEventListener("click", () => {
			selectedCounter = 0;
			updateCounterDisplay();
			logger.debug("Counter reset by Delete button");
		});
	}
}

/**
 * Update the counter display
 */
function updateCounterDisplay(): void {
	const counter = document.getElementById("zephyr-extension-selection-counter");
	if (counter) {
		counter.textContent = `Selected: ${selectedCounter}/${MAX_SELECTION}`;
	}
}

/**
 * Handle filter button click - select checkboxes for matching folder paths
 */
function handleFilterClick(): void {
	// Check if already at max
	if (selectedCounter >= MAX_SELECTION) {
		alert(`Already selected ${MAX_SELECTION} test cases.`);
		return;
	}

	const input = document.getElementById(
		"zephyr-extension-folder-filter-input",
	) as HTMLInputElement;
	if (!input || !input.value.trim()) {
		alert("Please enter a folder path to filter");
		return;
	}

	const filterPath = input.value.trim();
	const grid = document.querySelector(VIRTUALIZED_GRID_SELECTOR);
	if (!grid) {
		logger.error("Grid not found");
		return;
	}

	// Find all rows with matching folder path
	const allRows = grid.querySelectorAll("[data-row-id]");
	let newlySelected = 0;

	for (const row of allRows) {
		// Check global counter
		if (selectedCounter >= MAX_SELECTION) {
			break;
		}

		const folderPathSpan = row.querySelector(
			".zephyr-extension-folder-path",
		) as HTMLElement;
		if (!folderPathSpan) {
			continue;
		}

		const folderPath = folderPathSpan.getAttribute("data-folder-path");
		if (!folderPath || !folderPath.startsWith(filterPath)) {
			continue;
		}

		// Find and click the checkbox
		const checkbox = row.querySelector(
			'td[data-cell-id="checkbox"] input[type="checkbox"]',
		) as HTMLInputElement;
		if (checkbox && !checkbox.checked) {
			checkbox.click();
			selectedCounter++;
			newlySelected++;
		}
	}

	// Update counter display
	updateCounterDisplay();

	logger.info(
		`Selected ${newlySelected} test cases with folder path: ${filterPath} (total: ${selectedCounter})`,
	);
	if (newlySelected === 0 && selectedCounter < MAX_SELECTION) {
		alert(`No matching test cases found for folder path:\n${filterPath}`);
	}
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

	// Process all rows with data-row-id attribute
	const rows = grid.querySelectorAll("[data-row-id]");
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

	// Add filter UI
	addFilterUI();

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
