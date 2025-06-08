# Install MCP CLI

### A CLI tool to install and manage MCP servers running OAuth with dynamic client registration.

I.

## Usage

Just run
`npx mcp-i '<command>' --client <client> --name <your-mcp-name> --gateway <gateway-provider> --host <optional-oauth-callback>`

Also works with SSE URLs
`npx install-mcp '<url>' --client <client>`

where `<client>` is one of the following:

- `claude`
- `cline`
- `roo-cline`
- `windsurf`
- `witsy`
- `enconvo`
- `cursor`

## License

MIT
