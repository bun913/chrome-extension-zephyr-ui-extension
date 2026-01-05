import { SELECTORS } from "../common/constants";
import { logger } from "../common/logger";
import { waitForElement } from "../common/dom";

/**
 * Unique ID for the remove button
 */
const REMOVE_BUTTON_ID = "zephyr-extension-remove-btn";

/**
 * Create remove button
 */
export function createRemoveButton(onClick: () => void): HTMLButtonElement {
	const button = document.createElement("button");
	button.id = REMOVE_BUTTON_ID;
	button.className = "zephyr-extension-remove-btn";
	button.setAttribute("data-extension-id", "remove-test-case");
	button.style.cssText = `
		margin-right: 8px;
		padding: 4px 8px;
		background-color: #ff5630;
		color: white;
		border: none;
		border-radius: 3px;
		cursor: pointer;
		font-size: 12px;
		font-weight: 500;
		display: flex;
		align-items: center;
		gap: 4px;
	`;

	// Add extension icon
	const icon = document.createElement("img");
	icon.src = chrome.runtime.getURL("icon.png");
	icon.style.cssText = `
		width: 16px;
		height: 16px;
	`;

	const text = document.createElement("span");
	text.textContent = "Remove";

	button.appendChild(icon);
	button.appendChild(text);

	// Hover effect
	button.addEventListener("mouseenter", () => {
		button.style.backgroundColor = "#de350b";
	});
	button.addEventListener("mouseleave", () => {
		button.style.backgroundColor = "#ff5630";
	});

	// Click event
	button.addEventListener("click", onClick);

	return button;
}

/**
 * Add remove button to UI
 */
export async function addRemoveButton(onClick: () => void): Promise<void> {
	// Find header actions element
	const headerActions = document.querySelector(
		SELECTORS.TEST_EXECUTION_HEADER_ACTIONS,
	);

	if (!headerActions) {
		logger.debug("Header actions element not found, using MutationObserver...");
		const element = await waitForElement(
			SELECTORS.TEST_EXECUTION_HEADER_ACTIONS,
		);

		// Check if button already exists in this parent element
		if (element.querySelector(`#${REMOVE_BUTTON_ID}`)) {
			logger.debug("Button already exists in parent element");
			return;
		}

		const button = createRemoveButton(onClick);
		element.insertBefore(button, element.firstChild);
		logger.debug("Remove button added successfully!");
		return;
	}

	logger.debug("Found header actions element!");

	// Check if button already exists in this parent element
	if (headerActions.querySelector(`#${REMOVE_BUTTON_ID}`)) {
		logger.debug("Button already exists in parent element");
		return;
	}

	const button = createRemoveButton(onClick);
	headerActions.insertBefore(button, headerActions.firstChild);

	logger.debug("Remove button added successfully!");
}
