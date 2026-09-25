import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    server: {
      port: 3000,
      open: true,
    },
    define: {
      'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || 'https://nuiflptifdkexotxnxcp.supabase.co'),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_GfhZQfgUfhaiszDCu5JBZw_2c5zcNoG'),
      'process.env.VITE_N8N_WEBHOOK_URL': JSON.stringify(env.VITE_N8N_WEBHOOK_URL || 'https://n8n.srv1691210.hstgr.cloud/webhook/finface-payment-success'),
    },
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          adminLogin: resolve(__dirname, 'admin/login.html'),
          adminDashboard: resolve(__dirname, 'admin/dashboard.html'),
        },
      },
    },
  };
});
