export interface HttpRequestConfig {
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean>;
}

/** Minimal HTTP client port wrapping Axios for testability. */
export interface IHttpClient {
  post<TResponse, TBody = unknown>(url: string, body: TBody, config?: HttpRequestConfig): Promise<TResponse>;
  get<TResponse>(url: string, config?: HttpRequestConfig): Promise<TResponse>;
}
