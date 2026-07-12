"use client";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store";
import { io, Socket } from "socket.io-client";
import { addNotification } from "@/store/slices/notificationSlice";
import { fetchTasks } from "@/store/slices/taskSlice";
import toast from "react-hot-toast";

export function SocketInitializer() {
  const dispatch = useDispatch();
  const token = useSelector((state: RootState) => state.auth.token);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const socketUrl = process.env.NEXT_PUBLIC_API_URL 
      ? process.env.NEXT_PUBLIC_API_URL.replace("/api/v1", "")
      : "http://localhost:5000";

    // Reconnection limited to 5 attempts to prevent loop
    // User sees friendly message instead of infinite retry spam
    const newSocket = io(socketUrl, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,
      reconnectionDelayMax: 10000,
      withCredentials: true
    });

    newSocket.on("connect", () => {
      console.log("Socket connected:", newSocket.id);
    });

    // Handle incoming explicit notifications
    newSocket.on("notification:new", (data: any) => {
      const msg = data.body || data.title;
      dispatch(addNotification({
        employeeId: "system",
        employeeName: "System Notification",
        avatar: "SYS",
        type: data.type || "system",
        message: msg,
        priority: "normal"
      }));
      toast(msg, { icon: "🔔" });
    });

    // Handle generic alerts (late check-ins, early logouts)
    newSocket.on("attendance:alert", (data: any) => {
      dispatch(addNotification({
        employeeId: data.userId || "",
        employeeName: data.userName || "Employee",
        avatar: (data.userName || "E").substring(0, 2).toUpperCase(),
        type: "alert",
        message: data.message,
        priority: "high"
      }));
      toast.error(data.message, { icon: "🚨" });
    });

    // Handle explicit checkin event
    newSocket.on("attendance:checkin", (data: any) => {
      const msg = `${data.userName || "Employee"} checked in at ${new Date(data.checkInTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
      dispatch(addNotification({
        employeeId: data.userId || "",
        employeeName: data.userName || "Employee",
        avatar: (data.userName || "E").substring(0, 2).toUpperCase(),
        type: "attendance",
        message: msg,
        priority: "normal"
      }));
      toast.success(msg, { icon: "✅" });
    });

    // Handle task updates
    newSocket.on("task:updated", (data: any) => {
      const msg = `${data.userName || "Employee"} updated task "${data.taskTitle || "Task"}" to ${data.status}`;
      dispatch(addNotification({
        employeeId: data.userId || "",
        employeeName: data.userName || "Employee",
        avatar: (data.userName || "E").substring(0, 2).toUpperCase(),
        type: "system",
        message: msg,
        priority: "normal"
      }));
      toast.success(msg, { icon: "📝" });
      dispatch(fetchTasks() as any);
    });

    newSocket.on("task:completed", (data: any) => {
      const msg = `${data.userName || "Employee"} completed task "${data.taskTitle || "Task"}"`;
      dispatch(addNotification({
        employeeId: data.userId || "",
        employeeName: data.userName || "Employee",
        avatar: (data.userName || "E").substring(0, 2).toUpperCase(),
        type: "system",
        message: msg,
        priority: "normal"
      }));
      toast.success(msg, { icon: "✅" });
      dispatch(fetchTasks() as any);
    });

    // Handle explicit checkout event
    newSocket.on("attendance:checkout", (data: any) => {
      const msg = `${data.userName || "Employee"} checked out at ${new Date(data.checkOutTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
      dispatch(addNotification({
        employeeId: data.userId || "",
        employeeName: data.userName || "Employee",
        avatar: (data.userName || "E").substring(0, 2).toUpperCase(),
        type: "attendance",
        message: msg,
        priority: "normal"
      }));
      toast.success(msg, { icon: "👋" });
    });

    // Live status updates
    newSocket.on("staff:online", (data: any) => {
      const msg = `${data.name} is now online`;
      dispatch(addNotification({
        employeeId: data.userId || "",
        employeeName: data.name || "Employee",
        avatar: (data.name || "E").substring(0, 2).toUpperCase(),
        type: "system",
        message: msg,
        priority: "normal"
      }));
      toast.success(msg);
    });

    newSocket.on("staff:offline", (data: any) => {
      const msg = `${data.name} went offline`;
      dispatch(addNotification({
        employeeId: data.userId || "",
        employeeName: data.name || "Employee",
        avatar: (data.name || "E").substring(0, 2).toUpperCase(),
        type: "system",
        message: msg,
        priority: "normal"
      }));
      toast(msg, { icon: "💤" });
    });

    newSocket.on("connect_error", (err) => {
      console.warn("Socket connect error:", err.message);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [dispatch, token]);

  return null; // Invisible global listener component
}
