/**
 * Get value from cookie
 */
export function getCookie(name: string): string | null {
	const value = document.cookie.match(`(^|;)\\s*${name}\\s*=\\s*([^;]+)`);
	return value ? value.pop() || null : null;
}

/**
 * Get JWT token from cookie
 */
export function getJWT(): string | null {
	return getCookie("jwt");
}

/**
 * Refresh JWT token using reflect/token API
 */
export async function refreshJWT(
	projectId: string,
	testCycleKey: string,
	testCaseKey: string,
): Promise<string | null> {
	// Get current JWT token
	const currentJwt = getJWT();
	if (!currentJwt) {
		console.error("No JWT token found in cookies");
		return null;
	}

	const url = `https://app.tm4j.smartbear.com/backend/rest/tests/2.0/reflect/token?jiraProjectId=${projectId}&testCaseKey=${testCaseKey}&testCycleKey=${testCycleKey}`;

	try {
		const response = await fetch(url, {
			method: "GET",
			headers: {
				Authorization: `JWT ${currentJwt}`,
				"Content-Type": "application/json",
				"jira-project-id": projectId,
			},
			credentials: "include",
		});

		if (!response.ok) {
			console.error("Failed to refresh JWT:", response.status);
			return null;
		}

		const data = await response.json();

		// The response contains a token, and the API also sets the jwt cookie automatically
		if (data.token) {
			console.log("JWT refreshed successfully");
			// Wait a bit for the cookie to be set
			await new Promise((resolve) => setTimeout(resolve, 100));
			return getJWT();
		}

		return null;
	} catch (error) {
		console.error("Error refreshing JWT:", error);
		return null;
	}
}
