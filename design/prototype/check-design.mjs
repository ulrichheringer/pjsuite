import { build } from "esbuild";
import { mkdir } from "node:fs/promises";
await mkdir("outputs", { recursive: true });
await build({
  stdin: {
    contents: `
      import React from 'react';
      import { renderToString } from 'react-dom/server';
      import Product from './app/product';
      import { Identity } from './app/identity';
      import { Components, Storyboard, Tokens } from './app/boards';
      import { screens, colorTokens } from './app/catalog';
      import assert from 'node:assert/strict';
      let count = 0;
      assert.equal(screens.length, 34);
      assert.equal(new Set(screens.map(s => s.id)).size, 34);
      for (const screen of screens) {
        if (screen.next) assert(screens.some(s => s.id === screen.next));
        for (const preset of screen.states) {
          const html = renderToString(React.createElement(Product, { initialScreen: screen.id, preset }));
          assert(html.length > 700, screen.id + ' rendered no content');
          assert(!html.includes('lorem ipsum'));
          if (screen.id === 'invalid-link') {
            assert(!html.includes('Helena Duarte'));
            assert(!html.includes('Clara Martins'));
            assert(html.includes('Este link não está disponível.'));
          }
          if (screen.group === 'Portal do cliente') assert(!html.includes('pro-topbar'));
          if (screen.id === 'client-sign' && preset === 'Sucesso') assert(html.includes('Agora está combinado.'));
          if (screen.id === 'client-refuse' && preset === 'Sucesso') assert(html.includes('Sua decisão foi registrada.'));
          count++;
        }
      }
      for (const component of [Identity, Components, Tokens]) assert(renderToString(React.createElement(component)).length > 1000);
      assert(renderToString(React.createElement(Storyboard,{open:()=>{}})).includes('Helena cria.'));
      const lum = hex => {
        const values = hex.slice(1).match(/../g).map(c=>parseInt(c,16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);
        return values[0]*.2126+values[1]*.7152+values[2]*.0722;
      };
      const pairs = [['#263D52','#FFFFFF'],['#202C36','#F7F8FA'],['#5C6875','#FFFFFF'],['#995033','#FFFFFF'],['#28654B','#E7F2EB'],['#815B16','#F8EED8'],['#A13842','#F8E9EB'],['#355D82','#E8EFF7']];
      const contrasts = pairs.map(([fg,bg])=>{
        const a=lum(fg),b=lum(bg); const ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
        assert(ratio>=4.5, fg+' on '+bg+' contrast below AA');
        return {fg,bg,ratio:Number(ratio.toFixed(2))};
      });
      console.log(JSON.stringify({screens:screens.length,screenStatesRendered:count,boardsRendered:4,contrastPairs:contrasts},null,2));
    `,
    resolveDir: process.cwd(),
    loader: "tsx",
  },
  outfile: "outputs/check-design-bundle.mjs",
  bundle: true,
  packages: "external",
  platform: "node",
  format: "esm",
  jsx: "automatic",
  logLevel: "error",
});
await import("../outputs/check-design-bundle.mjs");
