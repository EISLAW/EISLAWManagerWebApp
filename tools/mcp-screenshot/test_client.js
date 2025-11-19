import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'path';

const transport = new StdioClientTransport({
  command: 'node',
  args: [path.resolve('./server.js')]
});

const client = new Client({ name: 'screenshot-tester', version: '0.1.0' });
await client.connect(transport);
const resp = await client.callTool({ name: 'capture_screen', arguments: {} });
console.log(JSON.stringify(resp, null, 2));
process.exit(0);
