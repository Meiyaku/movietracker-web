import '@testing-library/jest-dom'

// IntersectionObserver is not implemented in jsdom.
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Object.defineProperty(window, 'IntersectionObserver', {
  value: IntersectionObserverStub,
  writable: true,
  configurable: true,
})

// Vitest 4 + jsdom 29 starts with a broken localStorage (no clear/etc).
// Replace it with a reliable in-memory shim so tests can call localStorage.clear().
class LocalStorageMock {
  private store: Record<string, string> = {}
  getItem(key: string): string | null { return this.store[key] ?? null }
  setItem(key: string, value: string): void { this.store[key] = String(value) }
  removeItem(key: string): void { delete this.store[key] }
  clear(): void { this.store = {} }
  get length(): number { return Object.keys(this.store).length }
  key(index: number): string | null { return Object.keys(this.store)[index] ?? null }
}

Object.defineProperty(window, 'localStorage', {
  value: new LocalStorageMock(),
  writable: true,
  configurable: true,
})
