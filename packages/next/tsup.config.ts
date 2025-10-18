import fs from 'fs';
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: {
    entry: 'src/index.ts',
  },
  tsconfig: 'tsconfig.build.json',
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: false,
  external: ['react', 'react-dom', 'next', '@qstate/react'],
  async onSuccess() {
    function addClientDirective(filePath: string) {
      if (!fs.existsSync(filePath)) return;
      const content = fs.readFileSync(filePath, 'utf8');
      const directive = '"use client";\n';
      if (content.startsWith(directive)) return;
      fs.writeFileSync(filePath, directive + content, 'utf8');
    }

    ['dist/index.js', 'dist/index.cjs'].forEach(addClientDirective);
  },
});
