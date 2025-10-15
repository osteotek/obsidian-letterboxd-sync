let debugEnabled = false;

export function setDebugLogging(enabled: boolean): void {
	debugEnabled = enabled;
}

export function debugLog(message: string, ...optionalParams: unknown[]): void {
	if (debugEnabled) {
		console.debug(message, ...optionalParams);
	}
}
