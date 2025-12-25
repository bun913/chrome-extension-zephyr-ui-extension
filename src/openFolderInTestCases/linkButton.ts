import { logger } from "../common/logger";

/**
 * Create link icon button
 */
function createLinkButton(
	folderName: string,
	folderId: string,
): HTMLButtonElement {
	const button = document.createElement("button");
	button.className = "zephyr-extension-folder-link-btn";
	button.title = "Copy link to this folder";
	button.style.cssText = `
		margin-left: 4px;
		padding: 2px;
		background: transparent;
		border: none;
		cursor: pointer;
		opacity: 0.6;
		transition: opacity 0.2s;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	`;

	// Add link emoji
	const icon = document.createElement("span");
	icon.textContent = "🔗";
	icon.style.cssText = `
		font-size: 14px;
		line-height: 1;
	`;

	button.appendChild(icon);

	// Hover effect
	button.addEventListener("mouseenter", () => {
		button.style.opacity = "1";
	});
	button.addEventListener("mouseleave", () => {
		button.style.opacity = "0.6";
	});

	// Click event: Copy link to clipboard
	button.addEventListener("click", (e) => {
		e.stopPropagation(); // Prevent folder selection

		// Generate URL dynamically from iframe parameters
		const urlParams = new URLSearchParams(window.location.search);
		const projectKey = urlParams.get("projectKey");
		const parentOrigin = urlParams.get("xdm_e");

		if (!projectKey || !parentOrigin) {
			logger.error("Failed to get project info from URL");
			alert("Failed to generate folder link");
			return;
		}

		const decodedOrigin = decodeURIComponent(parentOrigin);
		const baseUrl = `${decodedOrigin}/projects/${projectKey}?selectedItem=com.atlassian.plugins.atlassian-connect-plugin:com.kanoah.test-manager__main-project-page#!/v2/testCases`;
		const encodedFolderName = encodeURIComponent(folderName);
		const url = `${baseUrl}#uiExtensionsFolderName=${encodedFolderName}&uiExtensionsFolderId=${folderId}`;

		// Use execCommand for iframe compatibility
		const textarea = document.createElement("textarea");
		textarea.value = url;
		textarea.style.position = "fixed";
		textarea.style.opacity = "0";
		document.body.appendChild(textarea);
		textarea.select();

		try {
			const success = document.execCommand("copy");
			document.body.removeChild(textarea);

			if (success) {
				logger.info("Folder link copied to clipboard!");

				// Visual feedback: Show "Copied!" text
				const originalContent = icon.textContent;
				icon.textContent = "✓";
				button.style.opacity = "1";

				const copiedText = document.createElement("span");
				copiedText.textContent = "Copied!";
				copiedText.style.cssText = `
					margin-left: 4px;
					font-size: 11px;
					color: #00875A;
					font-weight: 500;
				`;
				button.appendChild(copiedText);

				setTimeout(() => {
					icon.textContent = originalContent;
					button.style.opacity = "0.6";
					copiedText.remove();
				}, 1500);
			} else {
				throw new Error("execCommand failed");
			}
		} catch (error) {
			document.body.removeChild(textarea);
			logger.error("Failed to copy to clipboard:", error);
			alert("Failed to copy link to clipboard");
		}
	});

	return button;
}

/**
 * Add link buttons to all folders
 */
export function addLinkButtonsToFolders(): void {
	// Find all folder items
	const folders = document.querySelectorAll("[data-folder-id]");

	logger.debug(`Found ${folders.length} folders`);

	for (const folder of folders) {
		const folderId = folder.getAttribute("data-folder-id");
		const folderName = folder.getAttribute("data-folder-name");

		if (!folderId || !folderName) {
			continue;
		}

		// Check if link button already exists
		const nameWrapper = folder.querySelector(
			`[data-testid="folder-name-with-count-${folderId}"]`,
		);
		if (!nameWrapper) {
			continue;
		}

		if (nameWrapper.querySelector(".zephyr-extension-folder-link-btn")) {
			continue; // Already added
		}

		// Add link button
		const linkButton = createLinkButton(folderName, folderId);
		nameWrapper.appendChild(linkButton);

		logger.debug(`Link button added to folder: ${folderName} (${folderId})`);
	}
}
