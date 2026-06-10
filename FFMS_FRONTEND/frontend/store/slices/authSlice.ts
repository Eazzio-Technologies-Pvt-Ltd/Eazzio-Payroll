import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

export interface UserProfile {
  firstName: string;
  lastName: string;
  designation: string;
  photoUrl: string | null;
  email: string;
  mobileNo: string;
  role: string;
  id?: string;
  territoryId?: string | null;
}

interface AuthState {
  isLoggedIn: boolean;
  user: UserProfile | null;
  token: string | null;
  passwordHash?: string;
}

// Safe helper for localStorage
const getLocalStorageItem = (key: string, fallback: string | null): string | null => {
  if (typeof window !== "undefined") {
    return localStorage.getItem(key) || fallback;
  }
  return fallback;
};

const setLocalStorageItem = (key: string, value: string) => {
  if (typeof window !== "undefined") {
    localStorage.setItem(key, value);
  }
};

const removeLocalStorageItem = (key: string) => {
  if (typeof window !== "undefined") {
    localStorage.removeItem(key);
  }
};

const getInitialUser = (): UserProfile | null => {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("ff_user_profile");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    const isLoggedIn = localStorage.getItem("ff_is_logged_in") === "true";
    if (isLoggedIn) {
      // Legacy fallback for existing sessions
      return {
        firstName: "Admin",
        lastName: "User",
        designation: "ADMIN",
        photoUrl: null,
        email: "",
        mobileNo: "",
        role: "ADMIN",
        id: "mock-admin-id",
      };
    }
    return null;
  }
  return null;
};

const getInitialIsLoggedIn = (): boolean => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("ff_is_logged_in") === "true";
  }
  return false;
};

const getInitialToken = (): string | null => {
  return getLocalStorageItem("auth_token", null);
};

const initialState: AuthState = {
  isLoggedIn: getInitialIsLoggedIn(),
  user: getInitialUser(),
  token: getInitialToken(),
  passwordHash: "admin123", // default mock hash for AdminTopbar
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    login(
      state,
      action: PayloadAction<{
        token: string;
        user: { name?: string; email: string; role?: string; id?: string; territoryId?: string | null };
      }>
    ) {
      state.isLoggedIn = true;
      state.token = action.payload.token;

      const parts = (action.payload.user.name || "Admin User").split(" ");
      const firstName = parts[0] || "Admin";
      const lastName = parts.slice(1).join(" ") || "User";

      state.user = {
        firstName,
        lastName,
        designation: action.payload.user.role || "ADMIN",
        photoUrl: null,
        email: action.payload.user.email,
        mobileNo: "",
        role: action.payload.user.role || "ADMIN",
        id: action.payload.user.id,
        territoryId: action.payload.user.territoryId,
      };

      setLocalStorageItem("ff_is_logged_in", "true");
      setLocalStorageItem("auth_token", action.payload.token);
      setLocalStorageItem("ff_user_profile", JSON.stringify(state.user));
    },
    logout(state) {
      state.isLoggedIn = false;
      state.user = null;
      state.token = null;
      removeLocalStorageItem("ff_is_logged_in");
      removeLocalStorageItem("ff_user_profile");
      removeLocalStorageItem("auth_token");
      // Clear auth cookies so Edge middleware stops granting access
      if (typeof document !== "undefined") {
        document.cookie = "auth_token=; path=/; max-age=0; SameSite=Lax";
        document.cookie = "ff_user_role=; path=/; max-age=0; SameSite=Lax";
      }
    },
    updateProfile(state, action: PayloadAction<Partial<UserProfile>>) {
      if (state.user) {
        state.user = {
          ...state.user,
          ...action.payload,
        };
        setLocalStorageItem("ff_user_profile", JSON.stringify(state.user));
      }
    },
    changePassword(state, action: PayloadAction<string>) {
      state.passwordHash = action.payload;
    },
  },
});

export const { login, logout, updateProfile, changePassword } = authSlice.actions;
export default authSlice.reducer;
