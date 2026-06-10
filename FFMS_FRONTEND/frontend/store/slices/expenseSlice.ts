import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { expensesApi, ApiExpense } from "@/lib/api-client";

export interface ExpenseRecord {
  id: string;
  userName: string;
  employeeId: string;
  expenseHead: string;
  expenseCategory: string;
  amount: number;
  expenseDate: string;
  submittedOn: string;
  customer: string;
  status: "Pending Approval by Manager" | "Approved" | "Rejected";
  remark: string;
}

interface ExpenseState {
  list: ExpenseRecord[];
  loading: boolean;
  error: string | null;
}

const initialState: ExpenseState = {
  list: [],
  loading: false,
  error: null,
};

function mapStatus(s: string): ExpenseRecord["status"] {
  switch (s) {
    case "APPROVED": return "Approved";
    case "REJECTED": return "Rejected";
    default: return "Pending Approval by Manager";
  }
}

function mapApiToExpenseRecord(e: ApiExpense): ExpenseRecord {
  return {
    id: e.id,
    userName: e.user?.name || "Unknown",
    employeeId: e.userId,
    expenseHead: e.description || e.category,
    expenseCategory: e.category,
    amount: e.amount,
    expenseDate: new Date(e.date).toISOString().split("T")[0],
    submittedOn: new Date(e.createdAt).toISOString().split("T")[0],
    customer: "",
    status: mapStatus(e.status),
    remark: "",
  };
}

export const fetchExpenses = createAsyncThunk(
  "expenses/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const res = await expensesApi.getAll({ limit: 100 });
      return res.data.map(mapApiToExpenseRecord);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch expenses";
      return rejectWithValue(message);
    }
  }
);

export const createExpenseAsync = createAsyncThunk(
  "expenses/create",
  async (data: Record<string, unknown>, { rejectWithValue }) => {
    try {
      const res = await expensesApi.create(data);
      return mapApiToExpenseRecord(res.data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create expense";
      return rejectWithValue(message);
    }
  }
);

const expenseSlice = createSlice({
  name: "expenses",
  initialState,
  reducers: {
    addExpense(state, action: PayloadAction<ExpenseRecord>) {
      state.list.push(action.payload);
    },
    approveExpense(state, action: PayloadAction<string>) {
      const exp = state.list.find((e) => e.id === action.payload);
      if (exp) exp.status = "Approved";
    },
    rejectExpense(state, action: PayloadAction<{ id: string; remark: string }>) {
      const exp = state.list.find((e) => e.id === action.payload.id);
      if (exp) {
        exp.status = "Rejected";
        exp.remark = action.payload.remark || exp.remark;
      }
    },
    deleteExpense(state, action: PayloadAction<string>) {
      state.list = state.list.filter((e) => e.id !== action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchExpenses.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchExpenses.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchExpenses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(createExpenseAsync.fulfilled, (state, action) => {
        state.list.push(action.payload);
      });
  },
});

export const { addExpense, approveExpense, rejectExpense, deleteExpense } = expenseSlice.actions;
export default expenseSlice.reducer;
