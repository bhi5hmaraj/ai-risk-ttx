import ky, { type KyInstance } from 'ky';

// Ky instance with a single warm+retry hook for serverless cold instances
let api: KyInstance;

const afterResponse = async (request: Request, options: any, response: Response) => {
  try {
    // Only handle the submit-actions mutation path
    const url = new URL(request.url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    const isActionsPost = request.method === 'POST' && /\/api\/session\/[^/]+\/actions$/.test(url.pathname);
    if (!isActionsPost) return response;

    // If successful, nothing to do
    if (response.ok) return response;

    // Read body text (may be JSON) to detect Not Found
    let bodyText = '';
    try { bodyText = await response.clone().text(); } catch {}
    const isNotFound = response.status === 404 || (response.status === 500 && /not\s*found/i.test(bodyText));

    // Prevent loops using a header flag
    const alreadyRetried = (() => {
      const h = options?.headers;
      if (!h) return false;
      if (h instanceof Headers) return h.get('x-warm-retried') === '1';
      return String((h as any)['x-warm-retried'] ?? '') === '1';
    })();

    if (isNotFound && !alreadyRetried) {
      // Extract session id
      const m = url.pathname.match(/\/api\/session\/([^/]+)/);
      const sid = m?.[1];
      if (sid) {
        try { await api.get(`api/session/${sid}`).catch(() => null); } catch {}
        await new Promise((r) => setTimeout(r, 120));
        const headers = new Headers(options?.headers ?? {});
        headers.set('x-warm-retried', '1');
        // Replay the original request once through the same instance
        return api(request, { ...options, headers });
      }
    }
  } catch {
    // If anything in the hook errors, just return the original response
  }
  return response;
};

api = ky.create({
  // We pass relative URLs; Next.js will resolve against the current origin.
  throwHttpErrors: false,
  timeout: 30000,
  hooks: {
    afterResponse: [afterResponse],
  },
});

export { api };

