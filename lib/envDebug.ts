function mask(value: string, visible = 6): string {
  const v = String(value || '');
  if (!v) return '(unset)';
  if (v.length <= visible) return '*'.repeat(v.length);
  return `${v.slice(0, visible)}…`;
}

function parseDbUrlSummary(url: string): string {
  try {
    const u = new URL(url);
    const db = (u.pathname || '').replace(/^\//, '');
    const host = u.hostname || '(nohost)';
    const port = u.port ? `:${u.port}` : '';
    const schema = u.searchParams.get('schema');
    return `${host}${port}/${db}${schema ? `?schema=${schema}` : ''}`;
  } catch {
    return '(unparseable)';
  }
}

function safeLen(value: string | undefined): number {
  return String(value || '').length;
}

export function logRuntimeEnv(context: string): void {
  const infEnv = process.env.INFISICAL_ENVIRONMENT || process.env.NODE_ENV || '(unset)';
  const projectId = process.env.INFISICAL_PROJECT_ID || process.env.INFISICAL_WORKSPACE_ID || '';
  const siteUrl = process.env.INFISICAL_SITE_URL || 'https://app.infisical.com';

  const llmModel = process.env.LLM_MODEL || '';
  const nextPublicModel = process.env.NEXT_PUBLIC_LLM_MODEL || process.env.VITE_LLM_MODEL || '';
  const baseUrl = process.env.LITELLM_BASE_URL || process.env.OPENAI_BASE_URL || '';

  const dbUrl = process.env.DATABASE_URL || '';

  console.log(`[env:${context}] INFISICAL_ENVIRONMENT=${infEnv} INFISICAL_PROJECT_ID=${mask(projectId)} siteUrl=${siteUrl}`);
  console.log(`[env:${context}] LLM_MODEL=${llmModel || '(unset)'} NEXT_PUBLIC_LLM_MODEL=${nextPublicModel || '(unset)'} baseURL=${baseUrl || '(unset)'}`);
  console.log(`[env:${context}] LITELLM_API_KEY_LEN=${safeLen(process.env.LITELLM_API_KEY)} OPENAI_API_KEY_LEN=${safeLen(process.env.OPENAI_API_KEY)} CLERK_SECRET_KEY_LEN=${safeLen(process.env.CLERK_SECRET_KEY)}`);
  console.log(`[env:${context}] DATABASE_URL=${dbUrl ? parseDbUrlSummary(dbUrl) : '(unset)'}`);
}

