const DEV = typeof import.meta !== "undefined" && import.meta.env?.DEV;

function warn(action, key, error) {
  if (!DEV) return;
  console.warn(`[storage] ${action} failed for "${key}"`, error);
}

function cloneFallback(fallback) {
  if (Array.isArray(fallback)) return [...fallback];
  if (fallback && typeof fallback === "object") return { ...fallback };
  return fallback;
}

export function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return cloneFallback(fallback);
    const parsed = JSON.parse(raw);
    return parsed ?? cloneFallback(fallback);
  } catch (error) {
    warn("readJson", key, error);
    return cloneFallback(fallback);
  }
}

export function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    warn("writeJson", key, error);
    return false;
  }
}

export function readText(key, fallback = "") {
  try {
    const value = localStorage.getItem(key);
    return value ?? fallback;
  } catch (error) {
    warn("readText", key, error);
    return fallback;
  }
}

export function writeText(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    warn("writeText", key, error);
    return false;
  }
}

export function removeKey(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    warn("removeKey", key, error);
    return false;
  }
}
