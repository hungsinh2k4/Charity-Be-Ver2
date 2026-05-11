import { randomUUID } from 'crypto';

// Polyfill global crypto.randomUUID for @nestjs/schedule
if (typeof globalThis.crypto === 'undefined') {
  Object.defineProperty(globalThis, 'crypto', {
    value: {
      randomUUID: () => randomUUID(),
    },
    configurable: true,
    writable: true,
  });
} else if (typeof globalThis.crypto.randomUUID !== 'function') {
  globalThis.crypto.randomUUID = () => randomUUID();
}
