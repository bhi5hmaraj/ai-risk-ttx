import { handleMetaStatus } from '@/server/api/llm-handlers';

export const runtime = 'nodejs';

export async function GET() {
  return handleMetaStatus();
}

export async function HEAD() {
  return handleMetaStatus();
}
