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
