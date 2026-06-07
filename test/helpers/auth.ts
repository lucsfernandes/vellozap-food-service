import { api, type TestServer } from './http.js';

export interface SignedUpOwner {
  token: string;
  restaurantId: string;
  userId: string;
  email: string;
}

/** Signs up an owner and returns an access token + restaurant id. */
export async function signupOwner(server: TestServer, email: string): Promise<SignedUpOwner> {
  const res = await api(server.url, '/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password: 'secret123', restaurantName: `R-${email}` }),
  });
  if (res.status !== 201) {
    throw new Error(`signup failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  const body = res.body as {
    accessToken: string;
    user: { id: string };
    restaurant: { id: string };
  };
  return {
    token: body.accessToken,
    restaurantId: body.restaurant.id,
    userId: body.user.id,
    email,
  };
}
