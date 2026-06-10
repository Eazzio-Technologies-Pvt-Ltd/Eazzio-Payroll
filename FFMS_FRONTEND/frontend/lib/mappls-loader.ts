let loadPromise: Promise<void> | null = null;
let cachedToken: string | null = null;

/**
 * Fetch Mappls access token from the backend proxy.
 *
 * Flow: Frontend → Backend /api/v1/map/token (JWT-protected)
 *       Backend  → Mappls OAuth (client_id + client_secret)
 *       Backend  → returns short-lived access_token to frontend
 *
 * No API keys or secrets exist in the frontend bundle.
 */
export async function fetchMapToken(): Promise<string> {
  if (cachedToken) return cachedToken;

  const tokenUrl = process.env.NEXT_PUBLIC_MAP_TOKEN_URL;
  if (!tokenUrl) {
    throw new Error(
      "NEXT_PUBLIC_MAP_TOKEN_URL is not configured in .env.local"
    );
  }

  const jwt =
    typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;

  if (!jwt) {
    throw new Error("Login required to load maps");
  }

  const response = await fetch(tokenUrl, {
    method: 'GET',
    cache: 'no-store', // Crucial to prevent Next.js from caching the stale token
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("auth_token");
      window.location.href = "/login";
    }
    const errorData = await response.json().catch(() => ({}));
    const errorMsg =
      errorData.error?.message ||
      (typeof errorData.error === "string" ? errorData.error : null) ||
      `Map token fetch failed (HTTP ${response.status})`;
    throw new Error(errorMsg);
  }

  const data = await response.json();
  if (!data.success || !data.data?.token) {
    throw new Error("Invalid response from map token endpoint");
  }

  cachedToken = data.data.token;

  // Auto-expire the cached token before it actually expires
  const expiresIn = (data.data.expiresIn || 3600) * 1000;
  setTimeout(() => {
    cachedToken = null;
  }, Math.max(expiresIn - 60_000, 30_000));

  return cachedToken!;
}

/**
 * Load the Mappls Web SDK.
 *
 * 1. Fetches an OAuth access token via the backend proxy
 * 2. Injects the Mappls SDK script tag with that token
 * 3. Waits for the SDK to initialize (mappls + L on window)
 */
export function loadMapplsSDK(): Promise<void> {
  if (loadPromise) return loadPromise;

  loadPromise = new Promise(async (resolve, reject) => {
    // Already loaded from a previous page
    if (
      typeof (window as any).mappls !== "undefined" &&
      typeof (window as any).L !== "undefined"
    ) {
      resolve();
      return;
    }

    try {
      const token = await fetchMapToken();

      if (!token) {
        throw new Error("Map token is empty");
      }

      const callbackName = "__mapplsSDKReady";
      let isResolved = false;

      const safeResolve = () => {
        if (isResolved) return;
        isResolved = true;
        delete (window as any)[callbackName];
        resolve();
      };

      // Mappls SDK calls this when ready
      (window as any)[callbackName] = () => {
        // Only resolve when both scripts are loaded. The callback usually fires when map_sdk is ready.
        // We'll let the plugin script's onload handler resolve it if it finishes later.
      };

      // Inject the base SDK script
      const script = document.createElement("script");
      script.src =
        `https://apis.mappls.com/advancedmaps/api/${token}/map_sdk` +
        `?v=3.0&layer=vector&callback=${callbackName}`;
      script.async = true;
      script.defer = true;

      // Inject the plugins SDK script
      const pluginScript = document.createElement("script");
      pluginScript.src = `https://apis.mappls.com/advancedmaps/api/${token}/map_sdk_plugins?v=3.0`;
      pluginScript.async = true;
      pluginScript.defer = true;

      let scriptsLoaded = 0;
      const checkReady = () => {
        scriptsLoaded++;
        if (scriptsLoaded === 2) {
          safeResolve();
        }
      };

      script.onload = checkReady;
      pluginScript.onload = checkReady;

      // Fallback polling in case the callback doesn't fire
      const poll = setInterval(() => {
        if (
          typeof (window as any).mappls !== "undefined" &&
          typeof (window as any).L !== "undefined" &&
          typeof (window as any).mappls.getPinDetails !== "undefined"
        ) {
          clearInterval(poll);
          safeResolve();
        }
      }, 50);
      setTimeout(() => clearInterval(poll), 5000);

      script.onerror = () => {
        loadPromise = null;
        reject(new Error("Failed to load Mappls base SDK script"));
      };
      
      pluginScript.onerror = () => {
        loadPromise = null;
        reject(new Error("Failed to load Mappls plugins SDK script"));
      };

      document.head.appendChild(script);
      document.head.appendChild(pluginScript);
    } catch (err: any) {
      loadPromise = null;
      reject(err);
    }
  });

  return loadPromise;
}

/**
 * Clear the cached token (call on logout).
 */
export function clearMapToken(): void {
  cachedToken = null;
  loadPromise = null;
}
