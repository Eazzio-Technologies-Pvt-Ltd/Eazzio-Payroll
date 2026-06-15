/**
 * Centralized API client for FFMS backend.
 * All backend calls go through this module.
 * Backend response shape: { success: boolean, data: T, meta?: object }
 */

const BASE_URL =
  typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1"
    : "http://localhost:5000/api/v1";

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  meta?: { total: number; page: number; limit: number; totalPages: number };
  error?: { code: string; message: string; details?: unknown };
}

class ApiError extends Error {
  status: number;
  code: string;
  details: unknown;
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  query?: Record<string, string | number | undefined>
): Promise<ApiResponse<T>> {
  const url = new URL(`${BASE_URL}${path}`);
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") {
        url.searchParams.set(k, String(v));
      }
    });
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getAuthToken();
  if (token && token !== "dev_fallback_token") {
    headers["Authorization"] = `Bearer ${token}`;
  }

  console.log(`[api-client] Requesting: ${method} ${url.toString()}`, { headers });
  let res;
  try {
    res = await fetch(url.toString(), {
      method,
      headers,
      credentials: "include",
      ...(body && method !== "GET" ? { body: JSON.stringify(body) } : {}),
    });
  } catch (fetchErr: any) {
    console.error(`[api-client] Fetch failed for ${method} ${url.toString()}:`, fetchErr);
    throw fetchErr;
  }

  let json: ApiResponse<T> = await res.json();

  if (!res.ok || !json.success) {
    if (res.status === 401 && !path.includes("/auth/login") && !path.includes("/auth/refresh")) {
      try {
        // Attempt to refresh the token using the HTTP-Only cookie
        const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });

        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          if (refreshData.success && refreshData.data?.accessToken) {
            // Save new token
            localStorage.setItem("auth_token", refreshData.data.accessToken);
            
            // Retry original request with new token
            headers["Authorization"] = `Bearer ${refreshData.data.accessToken}`;
            res = await fetch(url.toString(), {
              method,
              headers,
              credentials: "include",
              ...(body && method !== "GET" ? { body: JSON.stringify(body) } : {}),
            });
            json = await res.json();
          } else {
            throw new Error("Refresh failed");
          }
        } else {
          throw new Error("Refresh failed");
        }
      } catch (err) {
        // If refresh fails, log the user out
        if (typeof window !== "undefined") {
          localStorage.removeItem("auth_token");
          localStorage.removeItem("ff_is_logged_in");
          localStorage.removeItem("ff_user_profile");
          document.cookie = "auth_token=; path=/; max-age=0; SameSite=Lax";
          document.cookie = "ff_user_role=; path=/; max-age=0; SameSite=Lax";
          window.location.href = "/login";
        }
      }
    }

    if (!res.ok || !json.success) {
      throw new ApiError(
        res.status,
        json.error?.code || "UNKNOWN",
        json.error?.message || `Request failed with status ${res.status}`,
        json.error?.details
      );
    }
  }

  return json;
}

// ─── Auth ────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    request<{ token: string; user: { id: string; name: string; email: string; role: string } }>(
      "POST", "/auth/login", { email, password }
    ),
  me: () =>
    request<{ id: string; name: string; email: string; role: string; organizationId: string }>(
      "GET", "/auth/me"
    ),
  logout: () => request("POST", "/auth/logout"),
};

// ─── Dashboard ───────────────────────────────────────
export const dashboardApi = {
  getAdmin: () =>
    request<{
      todayStats: { totalCheckedIn: number; totalAbsent: number; totalLate: number; tasksCompleted: number; tasksOverdue: number };
      weeklyActivity: { date: string; checkIns: number; tasksCompleted: number; visits: number }[];
      topPerformers: { user: { id: string; name: string; employeeId: string }; tasksCompleted: number; visits: number; rating: number }[];
      liveFieldStaff: unknown[];
      tasksByStatus: { pending: number; inProgress: number; completed: number; cancelled: number; overdue: number };
      attendanceRate: number;
      totalManagers: number;
      totalEmployees: number;
      activeProjects: number;
      pendingApprovals: number;
      employeeDistribution: { name: string; value: number; color: string }[];
      managersList: {
        id: string;
        name: string;
        email: string;
        department: string;
        assignedProjects: number;
        teamSize: number;
        status: "active" | "inactive";
        avatar: string;
        phone: string;
        joinedDate: string;
        performanceScore: number;
      }[];
    }>("GET", "/dashboard/admin"),
  getFieldStaff: () =>
    request("GET", "/dashboard/field-staff"),
};

// ─── Projects ────────────────────────────────────────
export interface ApiProject {
  id: string;
  name: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  status: string;
  managerId: string;
  manager?: { id: string; name: string; email: string };
  progress: number;
  totalTasks: number;
  completedTasks: number;
}

export const projectsApi = {
  list: (query?: Record<string, string | number | undefined>) =>
    request<ApiProject[]>("GET", "/projects", undefined, query),
  create: (data: Record<string, unknown>) =>
    request<ApiProject>("POST", "/projects", data),
  update: (id: string, data: Record<string, unknown>) =>
    request<ApiProject>("PATCH", `/projects/${id}`, data),
  delete: (id: string) =>
    request("DELETE", `/projects/${id}`),
};

// ─── Users (Employees) ──────────────────────────────
export interface ApiUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  profileImage: string | null;
  employeeId: string;
  role: string;
  status: string;
  managerId: string | null;
  territoryId: string | null;
  territory?: { id: string; name: string } | null;
  shiftId?: string | null;
  shift?: { id: string; name: string; startTime: string; endTime: string } | null;
  lastActiveAt: string | null;
  createdAt: string;
  employmentType?: string;
}

export const usersApi = {
  list: (query?: Record<string, string | number | undefined>) =>
    request<ApiUser[]>("GET", "/users", undefined, query),
  getById: (id: string) =>
    request<ApiUser>("GET", `/users/${id}`),
  create: (data: Record<string, unknown>) =>
    request<ApiUser>("POST", "/users", data),
  update: (id: string, data: Record<string, unknown>) =>
    request<ApiUser>("PATCH", `/users/${id}`, data),
  delete: (id: string) =>
    request("DELETE", `/users/${id}`),
  getHierarchy: (id: string) =>
    request("GET", `/users/${id}/hierarchy`),
};

// ─── Attendance ──────────────────────────────────────
export interface ApiAttendance {
  id: string;
  userId: string;
  user?: { id: string; name: string; employeeId: string };
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  checkInLatitude: number | null;
  checkInLongitude: number | null;
  workingMinutes: number | null;
  status: string;
  isLate: boolean;
  notes: string | null;
  selfieUrl: string | null;
}

export const attendanceApi = {
  list: (query?: Record<string, string | number | undefined>) =>
    request<ApiAttendance[]>("GET", "/attendance", undefined, query),
  today: () =>
    request<ApiAttendance[]>("GET", "/attendance/today"),
  summary: (startDate: string, endDate: string) =>
    request("GET", "/attendance/summary", undefined, { startDate, endDate }),
  checkIn: (data: { latitude: number; longitude: number; notes?: string }) =>
    request<ApiAttendance>("POST", "/attendance/check-in", data),
  checkOut: (data: { latitude: number; longitude: number; notes?: string }) =>
    request<ApiAttendance>("POST", "/attendance/check-out", data),
};

// ─── Tasks ───────────────────────────────────────────
export interface ApiTask {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  dueDate: string | null;
  scheduledDate: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  createdById: string;
  createdBy?: { id: string; name: string };
  territory?: { id: string; name: string } | null;
  assignments?: { 
    id: string; 
    userId: string; 
    user?: { id: string; name: string }; 
    status: string;
    completionNote?: string | null;
    completionImages?: string[];
  }[];
  createdAt: string;
}

export const tasksApi = {
  list: (query?: Record<string, string | number | undefined>) =>
    request<ApiTask[]>("GET", "/tasks", undefined, query),
  getById: (id: string) =>
    request<ApiTask>("GET", `/tasks/${id}`),
  create: (data: Record<string, unknown>) =>
    request("POST", "/tasks", data),
  update: (id: string, data: Record<string, unknown>) =>
    request("PATCH", `/tasks/${id}`, data),
  delete: (id: string) =>
    request("DELETE", `/tasks/${id}`),
  assign: (taskId: string, userId: string) =>
    request("POST", `/tasks/${taskId}/assign`, { userId }),
};

// ─── Expenses ────────────────────────────────────────
export interface ApiExpense {
  id: string;
  userId: string;
  user?: { id: string; name: string; manager?: { name: string } };
  category: string;
  amount: number;
  description: string | null;
  receiptUrl: string | null;
  date: string;
  status: string;
  approvedById: string | null;
  createdAt: string;
}

export interface ApiExpenseListResponse {
  expenses: ApiExpense[];
  total: number;
  page: number;
  limit: number;
}

export const expensesApi = {
  getMy: (query?: Record<string, string | number | undefined>) =>
    request<ApiExpenseListResponse>("GET", "/expenses/my", undefined, query),
  getTeam: (query?: Record<string, string | number | undefined>) =>
    request<ApiExpenseListResponse>("GET", "/expenses/team", undefined, query),
  getAll: (query?: Record<string, string | number | undefined>) =>
    request<ApiExpenseListResponse>("GET", "/expenses/all", undefined, query),
  create: (data: Record<string, unknown>) =>
    request<ApiExpense>("POST", "/expenses", data),
  update: (id: string, data: Record<string, unknown>) =>
    request<ApiExpense>("PUT", `/expenses/${id}`, data),
  submit: (id: string) =>
    request<ApiExpense>("PUT", `/expenses/${id}/submit`),
  approve: (id: string, note?: string) =>
    request<ApiExpense>("PUT", `/expenses/${id}/approve`, { approvalNote: note }),
  reject: (id: string, note?: string) =>
    request<ApiExpense>("PUT", `/expenses/${id}/reject`, { approvalNote: note }),
  delete: (id: string) =>
    request("DELETE", `/expenses/${id}`),
};

// ─── Notifications ───────────────────────────────────
export interface ApiNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  referenceId: string | null;
  isRead: boolean;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    employeeId: string;
  };
}

export const notificationsApi = {
  getAll: (query?: Record<string, string | number | undefined>) =>
    request<ApiNotification[]>("GET", "/notifications/all", undefined, query),
  getMy: (query?: Record<string, string | number | undefined>) =>
    request<ApiNotification[]>("GET", "/notifications", undefined, query),
  unreadCount: () =>
    request<{ count: number }>("GET", "/notifications/unread-count"),
  markRead: (id: string) =>
    request("PUT", `/notifications/${id}/read`),
  markAllRead: () =>
    request("PUT", "/notifications/read-all"),
  send: (data: { userId: string; title: string; body: string; type: string; priority?: string }) =>
    request("POST", "/notifications/send", data),
};

// ─── Leave ───────────────────────────────────────────
export const leaveApi = {
  getMy: (query?: Record<string, string | number | undefined>) =>
    request("GET", "/leave/my", undefined, query),
  create: (data: Record<string, unknown>) =>
    request("POST", "/leave/apply", data),
  approve: (id: string, note?: string) =>
    request("PUT", `/leave/${id}/approve`, { approvalNote: note }),
  reject: (id: string, note?: string) =>
    request("PUT", `/leave/${id}/reject`, { approvalNote: note }),
  getAll: (query?: Record<string, string | number | undefined>) =>
    request("GET", "/leave/all", undefined, query),
  getTeam: (query?: Record<string, string | number | undefined>) =>
    request("GET", "/leave/team", undefined, query),
};

// ─── Location ────────────────────────────────────────
export const locationApi = {
  getLive: () =>
    request("GET", "/location/live"),
  getHistory: (userId: string, query?: Record<string, string | number | undefined>) =>
    request("GET", `/location/${userId}/history`, undefined, query),
};

// ─── Geofence ────────────────────────────────────────
export const geofenceApi = {
  getZones: () =>
    request("GET", "/geofence/zones"),
  createZone: (data: Record<string, unknown>) =>
    request("POST", "/geofence/zones", data),
  updateZone: (id: string, data: Record<string, unknown>) =>
    request("PUT", `/geofence/zones/${id}`, data),
  deleteZone: (id: string) =>
    request("DELETE", `/geofence/zones/${id}`),
  getAlerts: (query?: Record<string, string | number | undefined>) =>
    request("GET", "/geofence/alerts", undefined, query),
};

// ─── Travel ──────────────────────────────────────────
export interface ApiTravelLog {
  id: string;
  userId: string;
  date: string;
  meterStart: number | null;
  meterEnd: number | null;
  totalDistanceKm: number;
  allowanceAmount: number;
  proofImageUrl: string | null;
  notes: string | null;
  createdAt: string;
}

export interface ApiTravelAllowanceResponse {
  totalDistanceKm: number;
  allowanceRate: number;
  totalAllowanceAmount: number;
  logs: ApiTravelLog[];
}

export const travelApi = {
  getUserMonthlyAllowance: (userId: string, year: number, month: number) =>
    request<ApiTravelAllowanceResponse>("GET", "/travel/all", undefined, { userId, year, month }),
  getLogs: (query: { userId: string; year?: number; month?: number }) =>
    request<ApiTravelAllowanceResponse>("GET", "/travel/all", undefined, query as any),
};

// ─── Advance ─────────────────────────────────────────
export const advanceApi = {
  getAll: (query?: Record<string, string | number | undefined>) =>
    request<any[]>("GET", "/advance/all", undefined, query),
  approve: (id: string) =>
    request("PUT", `/advance/${id}/approve`),
  reject: (id: string) =>
    request("PUT", `/advance/${id}/reject`),
};

// ─── Shift ───────────────────────────────────────────
export const shiftApi = {
  list: () => request<any[]>("GET", "/shifts"),
  get: (id: string) => request<any>("GET", `/shifts/${id}`),
  create: (data: Record<string, unknown>) => request<any>("POST", "/shifts", data),
  update: (id: string, data: Record<string, unknown>) => request<any>("PATCH", `/shifts/${id}`, data),
  delete: (id: string) => request("DELETE", `/shifts/${id}`),
};

// ─── Map Services ────────────────────────────────────
export const mapApi = {
  reverseGeocode: (lat: number | string, lng: number | string) =>
    request<{ results: any[] }>("GET", "/map/reverse-geocode", undefined, { lat, lng }),
};


// ─── Feedback ──────────────────────────────────────────
export interface ApiFeedback {
  id: string;
  category: string;
  content: string;
  rating: number | null;
  createdAt: string;
}

export const feedbackApi = {
  submit: (data: { organizationId: string; category: string; content: string; rating?: number }) =>
    request("POST", "/feedback/submit", data),
  getAll: (query?: Record<string, string | number | undefined>) =>
    request<{ feedbacks: ApiFeedback[]; total: number; page: number; limit: number }>("GET", "/feedback/all", undefined, query),
};


export { ApiError };
export default request;


