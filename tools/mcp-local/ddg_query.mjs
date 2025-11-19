import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.resolve(__dirname, "server.js");

async function main(){
  const transport = new StdioClientTransport({ command: "node", args: [serverPath] });
  const client = new Client({ name: "codex-ddg", version: "0.1.0" });
  await client.connect(transport);
  const queries = [
    "Import files into Figma",
    "Figma desktop import fig file"
  ];
  for (const q of queries){
    const resp = await client.callTool({ name: "ddg_search", arguments: { q } });
    console.log('QUERY:', q);
    console.log(JSON.stringify(resp, null, 2));
  }
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
