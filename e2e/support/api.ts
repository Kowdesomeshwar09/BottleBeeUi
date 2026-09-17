import { readFileSync } from 'node:fs';
import { APIRequestContext, request } from '@playwright/test';

import { ACCOUNTS, AccountName, STATE } from './accounts';

const API = process.env['E2E_API_URL'] || 'http://localhost:5000/api/v1/';

/**
 * Tokens already obtained this run, so no role is ever authenticated twice.
 *
 * The API rate-limits authentication to ten attempts per fifteen minutes per
 * email. A helper that logged in on construction exhausted that by itself —
 * roughly a quarter of the suite failed on HTTP 429 rather than on anything
 * being wrong with the application.
 */
const tokens = new Map<AccountName, string>();

/** Lifts the access token out of the session `auth.setup.ts` already saved. */
function tokenFromSavedSession(account: AccountName): string | null {
  try {
    const state = JSON.parse(readFileSync(STATE[account], 'utf8'));
    const entries = state?.origins?.[0]?.localStorage ?? [];
    return entries.find((e: { name: string }) => e.name === 'bb_access_token')?.value ?? null;
  } catch {
    // No saved session — a spec run without the setup project. Fall back to a
    // real login, which is one attempt rather than one per test group.
    return null;
  }
}

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

    const cached = tokens.get(account) ?? tokenFromSavedSession(account);
    if (cached) {
      tokens.set(account, cached);
      return new Api(ctx, cached);
    }

    const { email, password } = ACCOUNTS[account];
    const res = await ctx.post('auth/login', { data: { email, password } });
    if (!res.ok()) {
      throw new Error(
        `Could not sign in as ${account} (${email}): HTTP ${res.status()} ${await res.text()}. `
        + (res.status() === 429
          ? 'The login rate limit is exhausted — wait fifteen minutes, or raise '
            + 'AUTH_RATE_LIMIT_MAX in the API .env for local runs.'
          : 'Is the API running on port 5000 with the seeders applied?'),
      );
    }

    const body = await res.json();
    tokens.set(account, body.data.tokens.accessToken);
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

/**
 * Puts one buyable cart in place, big enough for the store to accept it.
 *
 * Stores set a minimum order value — the seeded one is 500 — and the cheapest
 * variant on the shelf is 150. A test that added a single unit got a perfectly
 * correct HTTP 409 BELOW_MINIMUM_ORDER and read as a checkout bug. So the
 * quantity is computed from the minimum the API itself reports rather than
 * guessed, which also keeps the test honest if the seed data changes.
 *
 * Clears the cart first: these tests share one customer, and a leftover row
 * from a previous test is how "remove the only item" stops emptying the cart.
 */
export async function seedBuyableCart(api: Api): Promise<{
  productSlug: string;
  productName: string;
  quantity: number;
  subtotal: number;
  grandTotal: number;
}> {
  const { variantId, productSlug, productName, price, available } = await firstBuyableVariant();

  await api.post('cart/clear');
  let cart = (await api.post<any>('cart/add-item', { productVariantId: variantId, quantity: 1 })).data;

  const minimum = Number(cart.vendor?.minOrderAmount ?? 0);

  if (minimum > 0 && Number(cart.subtotal) < minimum) {
    // Enough to clear the minimum, but never more than the shelf holds. The
    // regional rules also cap units per order, so this stays modest by design.
    const needed = Math.ceil(minimum / price);
    const quantity = Math.min(needed, available, 12);

    cart = (await api.post<any>('cart/update-item', {
      id: cart.items[0].id,
      quantity,
    })).data;

    if (Number(cart.subtotal) < minimum) {
      throw new Error(
        `Could not build a cart over the ${minimum} minimum: ${quantity} x ${price} `
        + `= ${cart.subtotal}, with only ${available} in stock. Re-seed the API.`,
      );
    }
  }

  return {
    productSlug,
    productName,
    quantity: cart.items[0].quantity,
    subtotal: Number(cart.subtotal),
    grandTotal: Number(cart.grandTotal),
  };
}
