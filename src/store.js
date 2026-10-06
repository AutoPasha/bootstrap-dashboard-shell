// Demo-стор оболочки: одно место, где живёт активный контекст.
// Страницы и меню его только читают и подписываются на изменения.

import { contexts, DEFAULT_CONTEXT } from './data.js';

const KEY = 'demo-shell:context';

export function createStore(initial) {
  let state = initial;
  const listeners = new Set();
  return {
    get: () => state,
    set(patch) {
      const prev = state;
      state = { ...state, ...patch };
      listeners.forEach((fn) => fn(state, prev));
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

function savedContextId() {
  try {
    const id = sessionStorage.getItem(KEY);
    return contexts.some((c) => c.id === id) ? id : DEFAULT_CONTEXT;
  } catch {
    return DEFAULT_CONTEXT;
  }
}

export const shellStore = createStore({ contextId: savedContextId() });

shellStore.subscribe((state) => {
  try {
    sessionStorage.setItem(KEY, state.contextId);
  } catch {
    // приватный режим Safari: живём без запоминания
  }
});

export function currentContext() {
  return contexts.find((c) => c.id === shellStore.get().contextId);
}
