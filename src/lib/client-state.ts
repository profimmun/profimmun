"use client";

import * as React from "react";

const subscribeNoop = () => () => {};

export function useClientMounted() {
  return React.useSyncExternalStore(subscribeNoop, () => true, () => false);
}

export function useStoredChoice<T extends string>(
  key: string,
  fallback: T,
  isAllowed: (value: string | null) => value is T
) {
  return React.useSyncExternalStore(
    (onStoreChange) => {
      function onStorage(event: StorageEvent) {
        if (event.key === key) onStoreChange();
      }
      window.addEventListener("storage", onStorage);
      window.addEventListener(storageEventName(key), onStoreChange);
      return () => {
        window.removeEventListener("storage", onStorage);
        window.removeEventListener(storageEventName(key), onStoreChange);
      };
    },
    () => {
      try {
        const value = localStorage.getItem(key);
        return isAllowed(value) ? value : fallback;
      } catch {
        return fallback;
      }
    },
    () => fallback
  );
}

export function useStoredFlag(key: string, serverValue = false) {
  return React.useSyncExternalStore(
    (onStoreChange) => {
      function onStorage(event: StorageEvent) {
        if (event.key === key) onStoreChange();
      }
      window.addEventListener("storage", onStorage);
      window.addEventListener(storageEventName(key), onStoreChange);
      return () => {
        window.removeEventListener("storage", onStorage);
        window.removeEventListener(storageEventName(key), onStoreChange);
      };
    },
    () => {
      try {
        return Boolean(localStorage.getItem(key));
      } catch {
        return false;
      }
    },
    () => serverValue
  );
}

export function notifyStoredValueChange(key: string) {
  window.dispatchEvent(new Event(storageEventName(key)));
}

export function useDocumentClass(className: string) {
  return React.useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener(documentClassEventName(className), onStoreChange);
      return () => window.removeEventListener(documentClassEventName(className), onStoreChange);
    },
    () => document.documentElement.classList.contains(className),
    () => false
  );
}

export function notifyDocumentClassChange(className: string) {
  window.dispatchEvent(new Event(documentClassEventName(className)));
}

function storageEventName(key: string) {
  return `local-storage:${key}`;
}

function documentClassEventName(className: string) {
  return `document-class:${className}`;
}
