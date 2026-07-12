import { store } from "@/store";
import { logout } from "@/store/slices/authSlice";

export async function fetchClient(url: string, options: RequestInit = {}) {
  // If we have a custom token from local storage (legacy or auth_token)
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // 401 Unauthorized Interceptor
    console.warn("401 Unauthorized detected. Triggering cleanup and redirect.");
    
    // Dispatch logout to clean Redux state and localStorage
    store.dispatch(logout());
    
    // Redirect to login
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }

  return response;
}
