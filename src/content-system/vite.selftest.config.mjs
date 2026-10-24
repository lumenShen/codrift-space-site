import { defineConfig } from 'vite';

// 内容系统自测构建配置（配合 selftest.ts，仅本地验证用，不影响项目构建）：
//   npx vite build --config src/content-system/vite.selftest.config.mjs
//   node src/content-system/.selftest-out/selftest.mjs
// 环境变量可重定向入口/输出（用于临时验证产物）：
//   SELFTEST_ENTRY / SELFTEST_OUT
const entry = process.env.SELFTEST_ENTRY ?? 'src/content-system/selftest.ts';
const outDir = process.env.SELFTEST_OUT ?? 'src/content-system/.selftest-out';

export default defineConfig({
  build: {
    outDir,
    emptyOutDir: true,
    lib: {
      entry,
      formats: ['es'],
      fileName: () => 'selftest.mjs',
    },
    minify: false,
    rollupOptions: {
      output: {
        entryFileNames: 'selftest.mjs',
        assetFileNames: 'selftest[extname]',
      },
    },
  },
  define: {
    __VUE_OPTIONS_API__: 'true',
    __VUE_PROD_DEVTOOLS__: 'false',
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false',
  },
});
