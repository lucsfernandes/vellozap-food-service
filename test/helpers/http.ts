import 'reflect-metadata';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { DataSource } from 'typeorm';
import { container } from 'tsyringe';
import { registerDependencies } from '../../src/infrastructure/di/container.js';
import { createServer } from '../../src/interfaces/http/server.js';

export interface TestServer {
  url: string;
  close: () => Promise<void>;
}

/** Boots the real Express app against the test DataSource on an ephemeral port. */
export async function startTestServer(dataSource: DataSource): Promise<TestServer> {
  const di = registerDependencies(dataSource);
  const app = createServer(di);

  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const address = server.address() as AddressInfo;
  const url = `http://127.0.0.1:${address.port}`;

  return {
    url,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}

/** Convenience JSON fetch wrapper that tolerates non-JSON (204) responses. */
export async function api(
  url: string,
  path: string,
  init?: RequestInit & { token?: string },
): Promise<{ status: number; body: unknown }> {
  const headers = new Headers(init?.headers);
  headers.set('content-type', 'application/json');
  if (init?.token) {
    headers.set('authorization', `Bearer ${init.token}`);
  }
  const res = await fetch(`${url}${path}`, { ...init, headers });
  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  return { status: res.status, body };
}

export { container };
