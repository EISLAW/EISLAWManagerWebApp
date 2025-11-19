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

await probe("https://www.tutsmake.com/how-to-import-files-in-figma/");
