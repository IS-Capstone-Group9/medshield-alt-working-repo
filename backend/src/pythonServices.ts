import path from 'node:path'
import { spawn, ChildProcessWithoutNullStreams } from 'node:child_process'

type PythonServiceConfig = {
  name: string
  moduleName: string
  healthUrl: string
  portEnvName: string
  defaultPort: string
}

const repoRoot = path.resolve(__dirname, '..', '..')
const pythonExecutable = process.env.PYTHON_EXECUTABLE?.trim() || (process.platform === 'win32' ? 'python' : 'python3')
const managedProcesses: ChildProcessWithoutNullStreams[] = []
let shutdownHandlersInstalled = false

function envEnabled(name: string, defaultValue: boolean): boolean {
  const value = process.env[name]
  if (!value) return defaultValue
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase())
}

async function serviceHealthy(url: string, timeoutMs = 1200): Promise<boolean> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { signal: controller.signal })
    return response.ok
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

function pipeServiceLogs(child: ChildProcessWithoutNullStreams, name: string): void {
  child.stdout.on('data', (chunk: Buffer) => {
    for (const line of chunk.toString().split(/\r?\n/).filter(Boolean)) {
      console.log(`[${name}] ${line}`)
    }
  })
  child.stderr.on('data', (chunk: Buffer) => {
    for (const line of chunk.toString().split(/\r?\n/).filter(Boolean)) {
      console.warn(`[${name}] ${line}`)
    }
  })
  child.on('exit', (code, signal) => {
    const expected = signal === 'SIGTERM' || signal === 'SIGINT'
    if (!expected && code !== 0) {
      console.warn(`[${name}] exited with code ${code ?? 'null'} signal ${signal ?? 'none'}`)
    }
  })
  child.on('error', (error) => {
    console.error(`[${name}] failed to start with ${pythonExecutable}:`, error)
  })
}

function installShutdownHandlers(): void {
  if (shutdownHandlersInstalled) return
  shutdownHandlersInstalled = true

  const stopChildren = () => {
    for (const child of managedProcesses) {
      if (!child.killed) {
        child.kill('SIGTERM')
      }
    }
  }

  process.once('exit', stopChildren)
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, () => {
      stopChildren()
      process.exit(signal === 'SIGINT' ? 130 : 143)
    })
  }
}

async function waitForHealthy(config: PythonServiceConfig): Promise<void> {
  const deadline = Date.now() + Number(process.env.PYTHON_SERVICE_STARTUP_TIMEOUT_MS ?? 15000)
  while (Date.now() < deadline) {
    if (await serviceHealthy(config.healthUrl, 1000)) {
      console.log(`${config.name} is ready at ${config.healthUrl}`)
      return
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  console.warn(`${config.name} did not become healthy at ${config.healthUrl} before timeout.`)
}

async function ensurePythonService(config: PythonServiceConfig): Promise<void> {
  if (await serviceHealthy(config.healthUrl)) {
    console.log(`${config.name} already running at ${config.healthUrl}`)
    return
  }

  const env = {
    ...process.env,
    [config.portEnvName]: process.env[config.portEnvName] ?? config.defaultPort,
    FLASK_DEBUG: process.env.FLASK_DEBUG ?? '0',
    PYTHONUNBUFFERED: '1',
  }
  const child = spawn(pythonExecutable, ['-m', config.moduleName], {
    cwd: repoRoot,
    env,
    windowsHide: true,
  })
  managedProcesses.push(child)
  pipeServiceLogs(child, config.name)
  console.log(`Starting ${config.name} with ${pythonExecutable} -m ${config.moduleName}`)
  await waitForHealthy(config)
}

export async function startPythonServices(analyticsUrl: string, productUrl: string): Promise<void> {
  if (!envEnabled('START_PYTHON_SERVICES', true)) {
    console.log('Python service auto-start is disabled by START_PYTHON_SERVICES=false.')
    return
  }

  installShutdownHandlers()
  const services: PythonServiceConfig[] = [
    {
      name: 'analytics-service',
      moduleName: 'services.analytics_service.app',
      healthUrl: `${analyticsUrl}/health`,
      portEnvName: 'ANALYTICS_SERVICE_PORT',
      defaultPort: '5101',
    },
    {
      name: 'product-service',
      moduleName: 'services.product_service.app',
      healthUrl: `${productUrl}/health`,
      portEnvName: 'PRODUCT_SERVICE_PORT',
      defaultPort: '5102',
    },
  ]

  await Promise.all(services.map((service) => ensurePythonService(service)))
}
