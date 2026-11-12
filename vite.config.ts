import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import {
  defineConfig,
  loadEnv,
  type Plugin,
  type PreviewServer,
  type ProxyOptions,
  type ViteDevServer,
} from 'vite';

import deployment from './vercel.json';

const root = fileURLToPath(new URL('.', import.meta.url));
const productPaths = new Set(
  deployment.rewrites
    .filter(({ destination }) => destination === '/app.html')
    .map(({ source }) => source),
);
const landing = deployment.rewrites.find(({ source }) => source === '/');
if (!landing) throw new Error('Oracle landing rewrite is missing from vercel.json');
const oracle = new URL(landing.destination).origin;
const landingProxy = {
  '^/(?:\\?|$)': { target: oracle, changeOrigin: true },
  '^/landing-assets(?:/|\\?|$)': { target: oracle, changeOrigin: true },
};

function localRoutes(): Plugin {
  const install = (server: ViteDevServer | PreviewServer, loadNotFound: () => Promise<string>) => {
    server.middlewares.use((request, _response, next) => {
      const path = request.url?.split('?')[0]?.replace(/\/$/, '') ?? '';
      if (productPaths.has(path)) request.url = '/app.html';
      next();
    });

    return () => {
      server.middlewares.use(async (request, response, next) => {
        const path = request.url?.split('?')[0];
        if (
          path === '/app.html' ||
          path === '/404.html' ||
          (request.method !== 'GET' && request.method !== 'HEAD')
        ) {
          next();
          return;
        }

        try {
          const html = await loadNotFound();
          response.statusCode = 404;
          response.setHeader('Content-Type', 'text/html; charset=utf-8');
          response.end(request.method === 'HEAD' ? undefined : html);
        } catch (error) {
          next(error);
        }
      });
    };
  };

  return {
    name: 'weiver-local-routes',
    configureServer(server) {
      return install(server, async () => {
        const html = await readFile(resolve(root, '404.html'), 'utf8');
        return server.transformIndexHtml('/404.html', html);
      });
    },
    configurePreviewServer(server) {
      return install(server, () =>
        readFile(resolve(root, server.config.build.outDir, '404.html'), 'utf8'),
      );
    },
  };
}

function apiProxy(target: string): ProxyOptions {
  return {
    target,
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api\/dev-proxy/, ''),
    configure(proxy) {
      proxy.on('proxyRes', (response) => {
        const cookies = response.headers['set-cookie'];
        if (!cookies) return;

        response.headers['set-cookie'] = cookies.map((cookie) => {
          const [value, ...attributes] = cookie.split(';');
          return [
            value,
            ...attributes
              .map((attribute) => attribute.trim())
              .filter((attribute) => attribute && !/^(secure$|domain=|samesite=)/i.test(attribute)),
            'SameSite=Lax',
          ].join('; ');
        });
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, root, '');
  const proxy: Record<string, ProxyOptions> = { ...landingProxy };
  if (env.VITE_API_BASE_URL === '/api/dev-proxy') {
    proxy['^/api/dev-proxy(?:/|\\?|$)'] = apiProxy(
      env.API_PROXY_TARGET ?? 'https://api.weiverai.com',
    );
  }

  return {
    appType: 'mpa',
    plugins: [react(), localRoutes()],
    resolve: { alias: { '@': resolve(root, 'src') } },
    build: {
      rollupOptions: { input: [resolve(root, 'app.html'), resolve(root, '404.html')] },
    },
    server: {
      proxy,
      https:
        mode === 'local-https'
          ? {
              cert: readFileSync(resolve(root, '.certs/local.weiverai.com.pem')),
              key: readFileSync(resolve(root, '.certs/local.weiverai.com-key.pem')),
            }
          : undefined,
    },
    preview: { proxy: landingProxy },
  };
});
