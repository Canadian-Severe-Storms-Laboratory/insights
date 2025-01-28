import { vitePlugin as remix } from '@remix-run/dev';
import { installGlobals } from '@remix-run/node';
import { remixDevTools } from 'remix-development-tools';
import { defineConfig } from 'vite';
import mkcert from 'vite-plugin-mkcert';
import tsconfigPaths from 'vite-tsconfig-paths';

installGlobals();

export default defineConfig({
	// Enable debug in dev
	logLevel: 'info',
	plugins: [
		process.env.NODE_ENV === 'development' && mkcert(),
		process.env.NODE_ENV === 'development' && remixDevTools(),
		remix({
			future: {
				v3_fetcherPersist: true,
				v3_relativeSplatPath: true,
				v3_throwAbortReason: true
			}
		}),
		tsconfigPaths()
	]
});
