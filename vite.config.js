import { defineConfig, loadEnv } from 'vite';
import preact from '@preact/preset-vite';

// Serves /api/waitlist during `vite dev`. With Supabase env vars set it runs the real
// serverless handler; without them it mocks responses so every UI state can be exercised:
// emails starting with "slow" take 10s, "fail" returns 500, "limit" returns 429, "bad" returns 400.
function devApi(env) {
  return {
    name: 'dev-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/waitlist', async (req, res) => {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const body = Buffer.concat(chunks).toString();

        let response;
        if (env.SUPABASE_URL && env.WAITLIST_RPC_TOKEN) {
          Object.assign(process.env, env);
          const { POST } = await server.ssrLoadModule('/api/waitlist.js');
          response = await POST(
            new Request('http://localhost/api/waitlist', { method: req.method, headers: req.headers, body }),
          );
        } else {
          const email = (() => {
            try {
              return String(JSON.parse(body).email || '');
            } catch {
              return '';
            }
          })();
          const wait = email.startsWith('slow') ? 10000 : 700;
          await new Promise((r) => setTimeout(r, wait));
          const status = email.startsWith('fail') ? 500 : email.startsWith('limit') ? 429 : email.startsWith('bad') ? 400 : 201;
          response = Response.json({ ok: status === 201 }, { status });
        }

        res.statusCode = response.status;
        res.setHeader('Content-Type', 'application/json');
        res.end(await response.text());
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [preact(), devApi(env)],
  };
});
