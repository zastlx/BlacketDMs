import chalk from "chalk";
import { build } from "esbuild";
import { readFile, writeFile } from "fs/promises";

const time = Date.now();

const userScriptBanner = await readFile("./scripts/banner.txt");

const defines = {
    isDev: `${process.argv.includes("--dev")}`
};

await build({
    entryPoints: ["src/index.ts"],
    bundle: true,
    format: "iife",
    target: ["esnext"],
    minify: true,
    legalComments: "none",
    footer: {
        js: "// made by zastix"
    },
    define: defines,
    outfile: "dist/bdms.min.js"
});

// userscript creation
const userScriptCode = `${userScriptBanner}\n${await readFile("dist/bdms.min.js")}`;
await writeFile("dist/bdms.user.js", userScriptCode);

// get size of files in kb
const minSize = (await readFile("dist/bpp.min.js")).length / 1024;
const userScriptSize = (await readFile("dist/bpp.user.js")).length / 1024;

console.log(`
- ⚡ Built in ${chalk.redBright((Date.now() - time) / 1000)}s
    ${chalk.magenta("dist/")}blacketDms.min.js    ${chalk.redBright(minSize.toFixed(2))}kb
    ${chalk.magenta("dist/")}blacketDms.user.js   ${chalk.redBright(userScriptSize.toFixed(2))}kb
`);