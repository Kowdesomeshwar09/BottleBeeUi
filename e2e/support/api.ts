import { APIRequestContext, request } from '@playwright/test';

import { ACCOUNTS, AccountName } from './accounts';

const API = process.env['E2E_API_URL'] || 'http://localhost:5000/api/v1/';

/**
 * A direct API client for test setup and teardown.
 *
 * Used to put the database into a known state — emptying a cart, walking an
 * order to a given status — without driving the UI through steps the test is
 * not actually about. Assertions stay in the UI; only arrangement happens here.
 */
export class Api {
  private constructor(
    private readonly ctx: APIRequestContext,
    private readonly token: string,
  ) {}

  static async as(account: AccountName): Promise<Api> {
    const ctx = await request.newContext({ baseURL: API });
    const { email, password } = ACCOUNTS[account];

    const res = await ctx.post('auth/login', { data: { email, password } });
    if (!res.ok()) {
      throw new Error(
        `Could not sign in as ${account} (${email}): HTTP ${res.status()} ${await res.text()}. ` +
        'Is the API running on port 5000 with the seeders applied?',
      );
    }

    const body = await res.json();
    return new Api(ctx, body.data.tokens.accessToken);
  }

  async post<T = any>(path: string, data: Record<string, unknown> = {}): Promise<T> {
    const res = await this.ctx.post(path, {
      data,
      headers: { Authorization: `Bearer ${this.token}` },
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok()) {
      throw new Error(`POST ${path} failed: HTTP ${res.status()} ${JSON.stringify(body)}`);
    }

    return body as T;
  }

  /** Does not throw on a non-2xx; for asserting that the server refuses something. */
  async attempt(path: string, data: Record<string, unknown> = {}) {
    const res = await this.ctx.post(path, {
      data,
      headers: { Authorization: `Bearer ${this.token}` },
    });
    return { status: res.status(), body: await res.json().catch(() => ({})) };
  }

  async dispose(): Promise<void> {
    await this.ctx.dispose();
  }
}

/** The cheapest in-stock variant on the storefront, for a predictable add-to-cart. */
export async function firstBuyableVariant(): Promise<{
  productName: string;
  productSlug: string;
  variantId: number;
  price: number;
  available: number;
}> {
  const ctx = await request.newContext({ baseURL: API });

  const res = await ctx.post('catalog/products/list', {
    data: { page: 1, limit: 20, inStockOnly: true, sortBy: 'price', sortOrder: 'ASC' },
  });

  const body = await res.json();
  await ctx.dispose();

  for (const product of body.data || []) {
    for (const variant of product.variants || []) {
      const available = variant.inventory?.quantityAvailable ?? 0;
      if (available > 0) {
        return {
          productName: product.name,
          productSlug: product.slug,
          variantId: variant.id,
          price: variant.sellingPrice,
          available,
        };
      }
    }
  }

  throw new Error('No in-stock variant found. Run the marketplace seeder in the API.');
}
