import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { attendanceApi, ApiAttendance } from "@/lib/api-client";

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  name: string;
  date: string;
  checkIn: string;
  checkOut: string;
  hours: string;
  status: string;
  location: string;
}

interface AttendanceState {
  list: AttendanceRecord[];
  loading: boolean;
  error: string | null;
}

const initialState: AttendanceState = {
  list: [],
  loading: false,
  error: null,
};

function formatTime(iso: string | null): string {
  if (!iso) return "--";
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function calcHours(checkIn: string | null, checkOut: string | null): string {
  if (!checkIn) return "--";
  if (!checkOut) return "Active";
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  const hrs = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  return `${hrs}h ${mins}m`;
}

function mapApiToRecord(a: ApiAttendance | any): AttendanceRecord {
  const isTodayFormat = a.checkedIn !== undefined;
  
  let formattedHours = calcHours(a.checkInTime, a.checkOutTime);
  // If backend provides pre-calculated workingMinutes, use them directly
  if (a.workingMinutes !== undefined && a.workingMinutes !== null) {
    if (!a.checkOutTime) {
      formattedHours = "Active";
    } else {
      const hrs = Math.floor(a.workingMinutes / 60);
      const mins = a.workingMinutes % 60;
      formattedHours = `${hrs}h ${mins}m`;
    }
  }
  
  return {
    id: a.id || a.userId || Math.random().toString(),
    employeeId: a.userId,
    name: isTodayFormat ? a.name : (a.user?.name || "Unknown"),
    date: a.date ? new Date(a.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
    checkIn: formatTime(a.checkInTime),
    checkOut: formatTime(a.checkOutTime),
    hours: formattedHours,
    status: a.status?.toLowerCase() || (isTodayFormat && !a.checkedIn ? "absent" : "present"),
    location: "",
  };
}

export const fetchAttendance = createAsyncThunk(
  "attendance/fetchAll",
  async (query: Record<string, string | number | undefined> | undefined, { rejectWithValue }: any) => {
    try {
      const res = await attendanceApi.list({ limit: 100, ...query });
      return res.data.map(mapApiToRecord);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch attendance";
      return rejectWithValue(message);
    }
  }
);

export const fetchTodayAttendance = createAsyncThunk(
  "attendance/fetchToday",
  async (_: any, { rejectWithValue }: any) => {
    try {
      const res = await attendanceApi.today();
      return res.data.map(mapApiToRecord);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch today's attendance";
      return rejectWithValue(message);
    }
  }
);

const attendanceSlice = createSlice({
  name: "attendance",
  initialState,
  reducers: {},
  extraReducers: (builder: any) => {
    builder
      .addCase(fetchAttendance.pending, (state: any) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAttendance.fulfilled, (state: any, action: any) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchAttendance.rejected, (state: any, action: any) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchTodayAttendance.pending, (state: any) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTodayAttendance.fulfilled, (state: any, action: any) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchTodayAttendance.rejected, (state: any, action: any) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export default attendanceSlice.reducer;
