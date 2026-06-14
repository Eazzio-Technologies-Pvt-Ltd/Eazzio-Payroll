import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { usersApi, ApiUser } from "@/lib/api-client";

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  territory: string;
  status: string;
  avatar: string;
  lat: number;
  lng: number;
  employeeId?: string;
  password?: string;
  territoryId?: string | null;
  managerId?: string | null;
  shiftId?: string | null;
  employmentType?: string;
}

interface EmployeeState {
  list: Employee[];
  loading: boolean;
  error: string | null;
}

const initialState: EmployeeState = {
  list: [],
  loading: false,
  error: null,
};

function mapApiUserToEmployee(u: ApiUser): Employee {
  const initials = u.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const savedType = typeof window !== "undefined" ? localStorage.getItem(`employment_type_${u.id}`) : null;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone || "",
    role: u.role,
    territory: u.territory?.name || "Unassigned",
    status: u.status?.toLowerCase() || "active",
    avatar: u.profileImage || initials,
    lat: 0,
    lng: 0,
    employeeId: u.employeeId,
    territoryId: u.territoryId,
    managerId: u.managerId,
    shiftId: u.shiftId,
    employmentType: savedType || "Full Time",
  };
}

export const fetchEmployees = createAsyncThunk(
  "employees/fetchAll",
  async (_: void, { rejectWithValue }: any) => {
    try {
      const res = await usersApi.list({ limit: 100 });
      return res.data.map(mapApiUserToEmployee);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch employees";
      return rejectWithValue(message);
    }
  }
);

export const createEmployee = createAsyncThunk(
  "employees/create",
  async (data: Record<string, unknown>, { rejectWithValue }: any) => {
    try {
      const res = await usersApi.create(data);
      return mapApiUserToEmployee(res.data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create employee";
      return rejectWithValue(message);
    }
  }
);

export const removeEmployee = createAsyncThunk(
  "employees/delete",
  async (id: string, { rejectWithValue }: any) => {
    try {
      await usersApi.delete(id);
      return id;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete employee";
      return rejectWithValue(message);
    }
  }
);

export const updateEmployeeThunk = createAsyncThunk(
  "employees/update",
  async ({ id, data }: { id: string; data: Record<string, unknown> }, { rejectWithValue }: any) => {
    try {
      const res = await usersApi.update(id, data);
      return mapApiUserToEmployee(res.data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update employee";
      return rejectWithValue(message);
    }
  }
);

const employeeSlice = createSlice({
  name: "employees",
  initialState,
  reducers: {
    addEmployee(state: EmployeeState, action: { payload: Employee }) {
      state.list.push(action.payload);
    },
    updateEmployee(state: EmployeeState, action: { payload: Employee }) {
      const idx = state.list.findIndex((e) => e.id === action.payload.id);
      if (idx !== -1) state.list[idx] = action.payload;
    },
    deleteEmployee(state: EmployeeState, action: { payload: string }) {
      state.list = state.list.filter((e) => e.id !== action.payload);
    },
    clearError(state: EmployeeState) {
      state.error = null;
    },
  },
  extraReducers: (builder: any) => {
    builder
      .addCase(fetchEmployees.pending, (state: EmployeeState) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEmployees.fulfilled, (state: EmployeeState, action: { payload: Employee[] }) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchEmployees.rejected, (state: EmployeeState, action: { payload: unknown }) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(createEmployee.fulfilled, (state: EmployeeState, action: { payload: Employee }) => {
        state.list.push(action.payload);
      })
      .addCase(updateEmployeeThunk.fulfilled, (state: EmployeeState, action: { payload: Employee }) => {
        const idx = state.list.findIndex((e) => e.id === action.payload.id);
        if (idx !== -1) state.list[idx] = action.payload;
      })
      .addCase(removeEmployee.fulfilled, (state: EmployeeState, action: { payload: string }) => {
        state.list = state.list.filter((e) => e.id !== action.payload);
      });
  },
});

export const { addEmployee, updateEmployee, deleteEmployee, clearError } = employeeSlice.actions;
export default employeeSlice.reducer;
