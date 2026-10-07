const TIMEOUT_MS = 15000;

export class SubmitError extends Error {
  constructor(message, { field = false } = {}) {
    super(message);
    this.field = field;
  }
}

export async function joinWaitlist(payload) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new SubmitError("You're offline. Check your connection and try again.");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res;
  try {
    res = await fetch('/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new SubmitError('The server took too long to respond. Please try again.');
    }
    throw new SubmitError("We couldn't reach the server. Check your connection and try again.");
  } finally {
    clearTimeout(timer);
  }

  if (res.ok) return;
  if (res.status === 400) throw new SubmitError('Please enter a valid email address.', { field: true });
  if (res.status === 429) throw new SubmitError('Too many attempts. Please wait a few minutes and try again.');
  throw new SubmitError('Something went wrong on our side. Please try again in a moment.');
}
