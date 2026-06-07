import axios, { type AxiosInstance } from 'axios';
import { injectable } from 'tsyringe';
import type { HttpRequestConfig, IHttpClient } from '../../../application/ports/IHttpClient.js';

@injectable()
export class AxiosHttpClient implements IHttpClient {
  private readonly client: AxiosInstance;

  public constructor() {
    this.client = axios.create({ timeout: 15000 });
  }

  public async post<TResponse, TBody = unknown>(
    url: string,
    body: TBody,
    config?: HttpRequestConfig,
  ): Promise<TResponse> {
    const res = await this.client.post<TResponse>(url, body, config);
    return res.data;
  }

  public async get<TResponse>(url: string, config?: HttpRequestConfig): Promise<TResponse> {
    const res = await this.client.get<TResponse>(url, config);
    return res.data;
  }
}
