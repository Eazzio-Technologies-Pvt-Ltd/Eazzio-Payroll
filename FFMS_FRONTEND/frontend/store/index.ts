// store/index.ts
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import employeeReducer from "./slices/employeeSlice";
import taskReducer from "./slices/taskSlice";
import attendanceReducer from "./slices/attendanceSlice";
import notificationReducer from "./slices/notificationSlice";
import expenseReducer from "./slices/expenseSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    employees: employeeReducer,
    tasks: taskReducer,
    attendance: attendanceReducer,
    notifications: notificationReducer,
    expenses: expenseReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
