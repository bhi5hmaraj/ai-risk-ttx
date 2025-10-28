import type { Context } from 'hono';

export async function readJsonBody<T = any>(c: Context): Promise<T> {
  // Try to read using the raw Web Request stream to avoid adapter quirks
  try {
    const raw: any = (c.req as any).raw;
    if (raw && typeof raw === 'object' && 'body' in raw) {
      const text = await new Response(raw.body as ReadableStream).text();
      if (!text) return {} as T;
      return JSON.parse(text) as T;
    }
  } catch {
    // fall through to Hono's parser
  }
  // Fallback: Hono's built-in JSON parser
  try {
    return (await c.req.json()) as T;
  } catch {
    return {} as T;
  }
}

