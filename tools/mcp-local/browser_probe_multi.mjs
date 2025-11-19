import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.resolve(__dirname, "server.js");

async function probe(url){
  const transport = new StdioClientTransport({ command: "node", args: [serverPath] });
  const client = new Client({ name: "codex-browser-probe", version: "0.1.0" });
  await client.connect(transport);
  const resp = await client.callTool({ name: "browser_probe", arguments: { url } });
  console.log('URL:', url);
  console.log(JSON.stringify(resp, null, 2));
}

const urls = [
  "https://help.figma.com/hc/en-us/articles/360040514274",
  "https://help.figma.com/hc/en-us/articles/1500004365121",
  "https://help.figma.com/hc/en-us/articles/360040533893"
];

async function main(){
  for (const url of urls){
    await probe(url);
  }
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
