import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main(){
  const serverPath = path.resolve(__dirname, 'server.js');
  const transport = new StdioClientTransport({ command: 'node', args: [serverPath] });
  const client = new Client({ name: 'eislaw-mcp-test', version: '0.1.0' });
  await client.connect(transport);

  const toolsList = await client.listTools();
  console.log('TOOLS:', JSON.stringify(toolsList, null, 2));

  const repoRoot = path.resolve(__dirname, '../..');
  const resp = await client.callTool({ name: 'list_dir', arguments: { path: repoRoot } });
  const content = resp?.content?.[0]?.text || JSON.stringify(resp);
  console.log('CALL:', content);
  process.exit(0);
}

main().catch(e=>{ console.error(e); process.exit(1); });
