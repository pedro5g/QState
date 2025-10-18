import fs from 'fs';
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: {
    entry: 'src/index.ts',
    resolve: true,
    compilerOptions: {
      tsconfig: 'tsconfig.build.json',
    },
  },
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: false,
  external: ['react', 'react-dom', 'next'],
  async onSuccess() {
    function addClientDirective(filePath: string) {
      const content = fs.readFileSync(filePath, 'utf8');
      const clientDirective = '"use client";\n';

      if (content.startsWith(clientDirective)) return;

      fs.writeFileSync(filePath, `${clientDirective}${content}`, 'utf8');
    }

    ['dist/index.js', 'dist/index.cjs'].forEach(addClientDirective);

    process.exit(0);
  },
});
