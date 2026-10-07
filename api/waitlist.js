import { createHash } from 'node:crypto';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_BODY_BYTES = 1024;

function json(status, body) {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

function clientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  return (forwarded?.split(',')[0] || request.headers.get('x-real-ip') || 'unknown').trim();
}

async function readEmail(request) {
  if (!request.headers.get('content-type')?.includes('application/json')) return null;
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return null;
  try {
    const body = JSON.parse(raw);
    if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
    const keys = Object.keys(body);
    if (keys.length !== 1 || keys[0] !== 'email' || typeof body.email !== 'string') return null;
    const email = body.email.trim().toLowerCase();
    return email.length <= 254 && EMAIL_PATTERN.test(email) ? email : null;
  } catch {
    return null;
  }
}

export async function POST(request) {
  const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, WAITLIST_RPC_TOKEN, IP_HASH_SALT } = process.env;
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY || !WAITLIST_RPC_TOKEN || !IP_HASH_SALT) {
    console.error('waitlist: missing server configuration');
    return json(500, { error: 'server_error' });
  }

  const email = await readEmail(request);
  if (!email) return json(400, { error: 'invalid_email' });

  const ipHash = createHash('sha256').update(`${IP_HASH_SALT}:${clientIp(request)}`).digest('hex');

  let result;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/join_waitlist`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_token: WAITLIST_RPC_TOKEN, p_email: email, p_ip_hash: ipHash }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.error('waitlist: rpc failed', res.status, await res.text());
      return json(500, { error: 'server_error' });
    }
    result = await res.json();
  } catch (err) {
    console.error('waitlist: rpc request error', err);
    return json(500, { error: 'server_error' });
  }

  if (result === 'ok') return json(201, { ok: true });
  if (result === 'rate_limited') return json(429, { error: 'rate_limited' });
  if (result === 'invalid') return json(400, { error: 'invalid_email' });
  console.error('waitlist: unexpected rpc result', result);
  return json(500, { error: 'server_error' });
}

export function GET() {
  return json(405, { error: 'method_not_allowed' });
}
