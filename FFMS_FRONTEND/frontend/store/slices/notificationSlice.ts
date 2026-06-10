import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { notificationsApi, ApiNotification } from "@/lib/api-client";

export interface NotificationItem {
  id: string;
  employeeId: string;
  employeeName: string;
  avatar: string;
  type: "attendance" | "task" | "alert" | "system";
  message: string;
  priority: "high" | "normal";
  read: boolean;
  date: string;
  time: string;
  title?: string;
  body?: string;
  isRead?: boolean;
  createdAt?: string;
  referenceId?: string | null;
}

interface NotificationState {
  list: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
}

const initialState: NotificationState = {
  list: [],
  unreadCount: 0,
  loading: false,
  error: null,
};

function mapTypeString(t: string): NotificationItem["type"] {
  const lower = t?.toLowerCase() || "";
  if (lower === "attendance") return "attendance";
  if (lower === "task") return "task";
  if (lower === "geofence" || lower === "alert" || lower === "report") return "alert";
  return "system";
}

function mapApiNotification(n: ApiNotification): NotificationItem {
  const d = new Date(n.createdAt);
  
  // Extract user info if available
  const empName = n.user?.name || "System";
  const empId = n.user?.employeeId || "";
  const initials = empName !== "System" && empName.length > 0 
    ? empName.substring(0, 2).toUpperCase() 
    : "SYS";
    
  return {
    id: n.id,
    employeeId: empId,
    employeeName: empName,
    avatar: initials,
    type: mapTypeString(n.type),
    message: n.body,
    priority: "normal",
    read: n.isRead,
    date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    time: d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    title: n.title,
    body: n.body,
    isRead: n.isRead,
    createdAt: n.createdAt,
    referenceId: n.referenceId,
  };
}

export const fetchNotifications = createAsyncThunk(
  "notifications/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const res = await notificationsApi.getAll({ limit: 50 });
      const data = res.data as any;
      const notificationsList = data.notifications ? data.notifications : data;
      return (notificationsList as ApiNotification[]).map(mapApiNotification);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch notifications";
      return rejectWithValue(message);
    }
  }
);

export const fetchUnreadCount = createAsyncThunk(
  "notifications/fetchUnreadCount",
  async (_, { rejectWithValue }) => {
    try {
      const res = await notificationsApi.unreadCount();
      const data = res.data as any;
      return data.unreadCount ?? data.count ?? 0;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch unread count";
      return rejectWithValue(message);
    }
  }
);

export const markNotificationRead = createAsyncThunk(
  "notifications/markRead",
  async (id: string, { rejectWithValue }) => {
    try {
      await notificationsApi.markRead(id);
      return id;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to mark as read";
      return rejectWithValue(message);
    }
  }
);

let nextId = 1;

const notificationSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    addNotification(
      state,
      action: PayloadAction<{
        employeeId: string;
        employeeName: string;
        avatar: string;
        type: "attendance" | "task" | "alert" | "system";
        message: string;
        priority: "high" | "normal";
      }>
    ) {
      const now = new Date();
      const item: NotificationItem = {
        id: `local-${nextId++}`,
        employeeId: action.payload.employeeId,
        employeeName: action.payload.employeeName,
        avatar: action.payload.avatar,
        type: action.payload.type,
        message: action.payload.message,
        priority: action.payload.priority,
        read: false,
        date: now.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        time: now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      };
      state.list.unshift(item);
      state.unreadCount += 1;
    },
    toggleNotificationRead(state, action: PayloadAction<string>) {
      const notif = state.list.find((n) => n.id === action.payload);
      if (notif) {
        notif.read = !notif.read;
        state.unreadCount = state.list.filter((n) => !n.read).length;
      }
    },
    markAllAsRead(state) {
      state.list.forEach((n) => {
        n.read = true;
      });
      state.unreadCount = 0;
    },
    clearAllNotifications(state) {
      state.list = [];
      state.unreadCount = 0;
    },
    clearNotifications(state) {
      state.list = [];
      state.unreadCount = 0;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
        state.unreadCount = action.payload.filter((n) => !n.read).length;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchUnreadCount.fulfilled, (state, action) => {
        state.unreadCount = action.payload;
      })
      .addCase(markNotificationRead.fulfilled, (state, action) => {
        const notif = state.list.find((n) => n.id === action.payload);
        if (notif && !notif.read) {
          notif.read = true;
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      });
  },
});

export const {
  addNotification,
  toggleNotificationRead,
  markAllAsRead,
  clearAllNotifications,
  clearNotifications,
} = notificationSlice.actions;
export default notificationSlice.reducer;
