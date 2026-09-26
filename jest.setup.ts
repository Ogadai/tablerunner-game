import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// JSDOM has no layout engine; Radix popovers still need this browser API to mount.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class implements ResizeObserver {
    observe = jest.fn();
    unobserve = jest.fn();
    disconnect = jest.fn();
  };
}

if (typeof globalThis.TextEncoder === 'undefined') {
  Object.defineProperty(globalThis, 'TextEncoder', {
    value: TextEncoder,
    configurable: true,
  });
}

if (typeof globalThis.TextDecoder === 'undefined') {
  Object.defineProperty(globalThis, 'TextDecoder', {
    value: TextDecoder,
    configurable: true,
  });
}
