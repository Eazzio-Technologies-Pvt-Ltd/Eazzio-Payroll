import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { tasksApi, ApiTask } from "@/lib/api-client";

export interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  employeeId: string;
  priority: string;
  status: string;
  deadline: string;
  territory: string;
}

interface TaskState {
  list: Task[];
  loading: boolean;
  error: string | null;
}

const initialState: TaskState = {
  list: [],
  loading: false,
  error: null,
};

function mapApiTaskToTask(t: ApiTask): Task {
  const assignee = t.assignments?.[0]?.user?.name || "Unassigned";
  const assigneeId = t.assignments?.[0]?.userId || "";
  return {
    id: t.id,
    title: t.title,
    description: t.description || "",
    assignedTo: assignee,
    employeeId: assigneeId,
    priority: t.priority?.toLowerCase() || "medium",
    status: t.status?.toLowerCase().replace("_", "-") || "pending",
    deadline: t.dueDate ? new Date(t.dueDate).toISOString().split("T")[0] : "",
    territory: t.territory?.name || "Unassigned",
  };
}

export const fetchTasks = createAsyncThunk(
  "tasks/fetchAll",
  async (query: Record<string, string | number | undefined> | undefined, { rejectWithValue }) => {
    try {
      const res = await tasksApi.list({ limit: 100, ...query });
      return res.data.map(mapApiTaskToTask);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch tasks";
      return rejectWithValue(message);
    }
  }
);

export const createTaskAsync = createAsyncThunk(
  "tasks/create",
  async (data: Record<string, unknown>, { rejectWithValue }) => {
    try {
      const res = await tasksApi.create(data);
      const raw = (res.data as { task?: ApiTask })?.task || (res.data as unknown as ApiTask);
      return mapApiTaskToTask(raw);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create task";
      return rejectWithValue(message);
    }
  }
);

export const deleteTaskAsync = createAsyncThunk(
  "tasks/delete",
  async (id: string, { rejectWithValue }) => {
    try {
      await tasksApi.delete(id);
      return id;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete task";
      return rejectWithValue(message);
    }
  }
);

const taskSlice = createSlice({
  name: "tasks",
  initialState,
  reducers: {
    addTask(state, action: PayloadAction<Task>) {
      state.list.push(action.payload);
    },
    updateTaskStatus(state, action: PayloadAction<{ id: string; status: string }>) {
      const task = state.list.find((t) => t.id === action.payload.id);
      if (task) task.status = action.payload.status;
    },
    deleteTask(state, action: PayloadAction<string>) {
      state.list = state.list.filter((t) => t.id !== action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTasks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(createTaskAsync.fulfilled, (state, action) => {
        state.list.push(action.payload);
      })
      .addCase(deleteTaskAsync.fulfilled, (state, action) => {
        state.list = state.list.filter((t) => t.id !== action.payload);
      });
  },
});

export const { addTask, updateTaskStatus, deleteTask } = taskSlice.actions;
export default taskSlice.reducer;
