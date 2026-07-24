import {
  lazy,
  type ComponentType,
  type LazyExoticComponent,
} from 'react'

const recoveryStorageKey = 'artist:lazy-module-recovery'
const lazyModuleErrorPattern =
  /chunkloaderror|dynamically imported module|failed to load module script|importing a module script failed|loading chunk [\w-]+ failed/i

function recoveryTarget(): string {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`
}

function storedRecoveryTarget(): string | null {
  try {
    return window.sessionStorage.getItem(recoveryStorageKey)
  } catch {
    return null
  }
}

function rememberRecoveryTarget(target: string): boolean {
  try {
    window.sessionStorage.setItem(recoveryStorageKey, target)
    return true
  } catch {
    return false
  }
}

function clearRecoveryTarget(): void {
  try {
    window.sessionStorage.removeItem(recoveryStorageKey)
  } catch {
    // Storage can be unavailable in restricted browsing modes.
  }
}

function lazyModuleFailed(error: unknown): boolean {
  const message =
    error instanceof Error
      ? `${error.name}: ${error.message}`
      : String(error)
  return lazyModuleErrorPattern.test(message)
}

function waitForReload(): Promise<never> {
  return new Promise(() => undefined)
}

export async function loadLazyModule<Module>(
  load: () => Promise<Module>,
): Promise<Module> {
  try {
    const module = await load()
    clearRecoveryTarget()
    return module
  } catch (error) {
    const target = recoveryTarget()
    const canRecover =
      lazyModuleFailed(error) &&
      storedRecoveryTarget() !== target &&
      rememberRecoveryTarget(target)

    if (!canRecover) {
      throw error
    }

    window.location.reload()
    return waitForReload()
  }
}

export function lazyComponent<Module>(
  load: () => Promise<Module>,
  select: (module: Module) => ComponentType,
): LazyExoticComponent<ComponentType> {
  return lazy(async () => ({
    default: select(await loadLazyModule(load)),
  }))
}
