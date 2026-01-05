/**
 * API関連の定数
 */
export const API_BASE_URL =
	"https://app.tm4j.smartbear.com/backend/rest/tests/2.0";

/**
 * UIセレクタ
 */
export const SELECTORS = {
	TEST_EXECUTION_HEADER_ACTIONS:
		'[data-testid="test-execution-header-actions"]',
} as const;

/**
 * URL パターン
 */
export const URL_PATTERNS = {
	TEST_PLAYER: "/v2/testPlayer/",
	TEST_CYCLE_ADD_TEST_CASES: "/v2/testCycle/",
} as const;
