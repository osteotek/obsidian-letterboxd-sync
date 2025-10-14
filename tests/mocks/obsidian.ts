export type RequestUrlParams = string | {
	url: string;
	method?: string;
	headers?: Record<string, string>;
	body?: string | ArrayBuffer;
	throw?: boolean;
};

export interface RequestUrlResponse {
	status: number;
	headers: Record<string, string>;
	text: string;
	arrayBuffer: ArrayBuffer;
}

type RequestUrlImplementation = (params: RequestUrlParams) => Promise<RequestUrlResponse>;

const defaultImplementation: RequestUrlImplementation = async () => {
	throw new Error('requestUrl mock not implemented');
};

let currentImplementation: RequestUrlImplementation = defaultImplementation;

export function requestUrl(params: RequestUrlParams): Promise<RequestUrlResponse> {
	return currentImplementation(params);
}

export function __setRequestUrlImplementation(impl: RequestUrlImplementation): void {
	currentImplementation = impl;
}

export function __resetRequestUrlImplementation(): void {
	currentImplementation = defaultImplementation;
}
