import type { ArgumentsCamelCase, Argv } from 'yargs'
import { logger } from '../logger'
import { green, red } from 'picocolors'
import { clientNames, readConfig, writeConfig } from '../client-config'

export interface InstallArgv {
  target?: string
  name?: string
  client: string
  local?: boolean
  yes?: boolean
  gateway?: string
  host?: string
  transport?: string
}

export const command = 'install [target]'
export const describe = 'Install MCP server'
export const aliases = ['i']

export function builder(yargs: Argv<InstallArgv>): Argv {
  return yargs
    .positional('target', {
      type: 'string',
      description: 'Installation target (URL or command)',
    })
    .option('name', {
      type: 'string',
      description: 'Name of the server (auto-extracted from target if not provided)',
      default: 'spydr-memory',
    })
    .option('client', {
      type: 'string',
      description: 'Client to use for installation',
      demandOption: true,
    })
    .option('yes', {
      type: 'boolean',
      alias: 'y',
      description: 'Skip confirmation prompt',
      default: false,
    })
    .option('gateway', {
      type: 'string',
      description: 'Gateway to use for installation (defaults to "mcp-remote@0.1.17")',
      default: 'mcp-remote@0.1.17',
    })
    .option('host', {
      type: 'string',
      description: 'Host to use for installation (e.g., 127.0.0.1)',
      alias: 'h',
      default: '127.0.0.1',
    })
    .option('transport', {
      type: 'string',
      description: 'Transport to use for installation (e.g., http-only)',
      alias: 't',
      default: 'http-only',
    })
    .option('local', {
      type: 'boolean',
      description: 'Install to the local directory instead of the default location',
      default: false,
    })
    .option('args', {
      type: 'string',
      description: 'Additional arguments to pass to the gateway',
    })
}

export async function handler(argv: ArgumentsCamelCase<InstallArgv>) {
  if (!argv.client || !clientNames.includes(argv.client)) {
    logger.error(`Invalid client: ${argv.client}. Available clients: ${clientNames.join(', ')}`)
    return
  }

  let target = argv.target
  if (!target) {
    target = (await logger.prompt('Enter the installation target (URL or command):', {
      type: 'text',
    })) as string
  }

  let name = argv.name
  if (!name) {
    // Auto-extract name from target
    if (target.startsWith('http') || target.startsWith('https')) {
      // For URLs, try to extract from the last part of the path
      const urlParts = target.split('/')
      if (urlParts.length > 3) {
        name = urlParts[urlParts.length - 2]
      } else {
        name = urlParts[urlParts.length - 1]
      }
    } else {
      // For commands, try to extract package name
      const parts = target.split(' ')
      if (parts[0] === 'npx' && parts.length > 1) {
        // Skip flags like -y and get the package name
        const packageIndex = parts.findIndex((part, index) => index > 0 && !part.startsWith('-'))
        if (packageIndex !== -1) {
          name = parts[packageIndex]
        } else {
          name = parts[parts.length - 1]
        }
      } else {
        name = parts[0]
      }
    }

    // If we still don't have a name, prompt for it
    if (!name || name === '') {
      name = (await logger.prompt('Enter the name of the server:', {
        type: 'text',
      })) as string
    }
  }

  if (argv.host) {
    logger.info(`Using host ${argv.host}`)
  }

  if (argv.transport) {
    logger.info(`Using transport ${argv.transport}`)
  }

  logger.info(`Installing MCP server ${argv.client} with target ${argv.target} and name ${name}`)

  let ready = argv.yes
  if (!ready) {
    ready = await logger.prompt(
      green(
        `Are you ready to install MCP server "${name}" (${target}) in ${argv.client}${argv.local ? ' (locally)' : ''}?`,
      ),
      {
        type: 'confirm',
      },
    )
  }

  if (ready) {
    try {
      const config = readConfig(argv.client, argv.local)

      // if it is a URL, add it to config
      if (target.startsWith('http') || target.startsWith('https')) {
        const gatewayArgs = argv.gateway ? [argv.gateway] : ['mcp-remote@0.1.17']
        const transportArg = argv.transport ? [`--transport`, argv.transport] : []
        config.mcpServers[name] = {
          command: 'npx',
          args: ['-y', ...gatewayArgs, target, ...transportArg],
        }
        writeConfig(config, argv.client, argv.local)
      }

      // if it is a command, add it to config
      else {
        config.mcpServers[name] = {
          command: target.split(' ')[0],
          args: target.split(' ').slice(1),
        }
        writeConfig(config, argv.client, argv.local)
      }

      logger.box(
        green(
          `Successfully installed MCP server "${name}" (${target}) in ${argv.client}${argv.local ? ' (locally)' : ''}.`,
        ),
      )
    } catch (e) {
      logger.error(red((e as Error).message))
    }
  }
}
