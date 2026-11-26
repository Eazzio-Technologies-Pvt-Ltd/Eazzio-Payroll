// store/index.ts
import { combineReducers, configureStore } from "@reduxjs/toolkit";
import authReducer, { logout } from "./slices/authSlice";
import employeeReducer from "./slices/employeeSlice";
import taskReducer from "./slices/taskSlice";
import attendanceReducer from "./slices/attendanceSlice";
import notificationReducer from "./slices/notificationSlice";
import expenseReducer from "./slices/expenseSlice";

const appReducer = combineReducers({
  auth: authReducer,
  employees: employeeReducer,
  tasks: taskReducer,
  attendance: attendanceReducer,
  notifications: notificationReducer,
  expenses: expenseReducer,
});

const rootReducer: typeof appReducer = (state, action) => {
  if (logout.match(action)) {
    return appReducer(undefined, action);
  }
  return appReducer(state, action);
};

export const store = configureStore({
  reducer: rootReducer,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
