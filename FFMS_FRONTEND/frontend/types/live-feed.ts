export interface HistoryLog {
  id: string;
  userId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  recordedAt: string;
  batteryLevel?: number;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  territory: string;
  status: "online" | "offline";
  lastActive: string;
  batteryLevel: number;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  phone: string;
  avatar: string;
  email: string;
  inTime?: string;
  outTime?: string;
  punches?: { in: string; out: string }[];
  tasksToday?: number;
  speed?: number;
  accuracy?: number;
  isMoving?: boolean;
  historyLogs?: HistoryLog[];
  distance?: string;
  workingHours?: string;
}

