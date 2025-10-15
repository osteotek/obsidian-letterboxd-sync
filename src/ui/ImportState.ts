/**
 * Simple state manager for import modal
 */
export enum ImportStatus {
	IDLE = 'idle',
	IMPORTING = 'importing',
	CANCELLED = 'cancelled',
	COMPLETED = 'completed',
	ERROR = 'error'
}

export class ImportState {
	private status: ImportStatus = ImportStatus.IDLE;
	private cancelCallback: (() => void) | null = null;

	getStatus(): ImportStatus {
		return this.status;
	}

	isImporting(): boolean {
		return this.status === ImportStatus.IMPORTING;
	}

	startImport(cancelFn: () => void): void {
		this.status = ImportStatus.IMPORTING;
		this.cancelCallback = cancelFn;
	}

	cancel(): void {
		if (this.status === ImportStatus.IMPORTING && this.cancelCallback) {
			this.cancelCallback();
			this.status = ImportStatus.CANCELLED;
		}
	}

	complete(): void {
		this.status = ImportStatus.COMPLETED;
		this.cancelCallback = null;
	}

	error(): void {
		this.status = ImportStatus.ERROR;
		this.cancelCallback = null;
	}

	reset(): void {
		this.status = ImportStatus.IDLE;
		this.cancelCallback = null;
	}
}
