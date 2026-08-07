import fs from "node:fs";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";

// Local-only HTTPS for testing camera access (getUserMedia needs a secure
// context) from a phone over the LAN. Gated on the cert existing so this is
// a no-op for anyone (or CI) without one — see docs on running `mkcert`.
const certPath = "./.cert/dev-cert.pem";
const keyPath = "./.cert/dev-key.pem";
const hasLocalCert = fs.existsSync(certPath) && fs.existsSync(keyPath);

export default defineConfig(({ mode }) => {
  // Nothing else loads .env into the dev-server process; merge it here so
  // DATABASE_PATH, ADMIN_PASSWORD, and SESSION_SECRET reach server code in
  // dev. Production env comes from Fly secrets, not this path.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ""));
  return {
    plugins: [tailwindcss(), reactRouter()],
    resolve: {
      tsconfigPaths: true,
    },
    server: hasLocalCert
      ? {
          host: true,
          https: {
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath),
          },
        }
      : undefined,
  };
});
