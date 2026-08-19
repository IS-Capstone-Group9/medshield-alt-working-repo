const fs = require('fs');
const ts = fs.readFileSync('./frontend/lib/medshieldReference.ts', 'utf8');
const scriptMatch = ts.match(/export const MEDSHIELD_SCRIPT = `([\s\S]*?)`;/);
if (!scriptMatch) throw new Error("MEDSHIELD_SCRIPT not found");
const script = scriptMatch[1];
const DASHBOARD_GLOBAL_HANDLERS = ['showPage', 'toggleTheme'];
const globalHandlerBridge = DASHBOARD_GLOBAL_HANDLERS.map(name => `if (typeof ${name} === 'function') window.${name} = ${name};`).join('\n');

let patchedScript = script
  .replace(/window\.([a-zA-Z0-9_]+)\s*=\s*\1;?/g, "if (typeof $1 !== 'undefined') window.$1 = $1;")
  .replace("window.addEventListener('DOMContentLoaded', async () => {", `(async () => {\n${globalHandlerBridge}\n`);

if (patchedScript.includes("});\n\nif (typeof window !== 'undefined')")) {
  patchedScript = patchedScript.replace("});\n\nif (typeof window !== 'undefined')", "})();\n\nif (typeof window !== 'undefined')");
}

fs.writeFileSync('./patched-script-dump.js', patchedScript);

try {
  new Function(patchedScript);
  console.log('Syntax OK');
} catch (e) {
  console.error('Syntax Error:', e);
}
