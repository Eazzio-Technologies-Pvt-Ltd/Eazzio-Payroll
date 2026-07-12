"use client";

import { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/store";
import { fetchEmployees } from "@/store/slices/employeeSlice";
import { fetchTasks } from "@/store/slices/taskSlice";
import { fetchTodayAttendance } from "@/store/slices/attendanceSlice";
import { fetchExpenses } from "@/store/slices/expenseSlice";
import { fetchNotifications } from "@/store/slices/notificationSlice";

/**
 * Client component that dispatches all initial data fetches once.
 * Placed inside the dashboard layout so all child pages get data from the store.
 */
export default function DataInitializer() {
  const dispatch = useDispatch<AppDispatch>();
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;

    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    if (!token || token === "dev_fallback_token") return;

    dispatch(fetchEmployees());
    dispatch(fetchTasks({}));
    dispatch(fetchTodayAttendance(undefined));
    dispatch(fetchExpenses());
    dispatch(fetchNotifications());
  }, [dispatch]);

  return null;
}
