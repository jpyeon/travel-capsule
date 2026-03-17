import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    // Pure algorithm and service tests run in node; switch to 'jsdom' when
    // component tests are added.
    environment: 'node',
    globals: true,
  },
});
