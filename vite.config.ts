import { reactRouter } from "@react-router/dev/vite";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  // Nothing else loads .env into the dev-server process; merge it here so
  // DATABASE_PATH, ADMIN_PASSWORD, and SESSION_SECRET reach server code in
  // dev. Production env comes from Fly secrets, not this path.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ""));
  return {
    plugins: [reactRouter()],
    resolve: {
      tsconfigPaths: true,
    },
  };
});
