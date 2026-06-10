export interface RoutePoint {
  lat: number;
  lng: number;
  time: string;
  speed: string;
  status: string;
}

export interface Geofence {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius: number; // in meters
}

export interface EmployeeGeofenceData {
  employeeId: string;
  employeeName: string;
  avatar: string;
  role: string;
  geofences: Geofence[];
  route: RoutePoint[];
}

export const mockEmployeeRoutes: Record<string, EmployeeGeofenceData> = {
  "1": {
    employeeId: "1",
    employeeName: "Rahul Sharma",
    avatar: "RS",
    role: "Sales Executive",
    geofences: [
      { id: "gf-1a", name: "Mumbai North HQ", lat: 19.055, lng: 72.855, radius: 500 },
      { id: "gf-1b", name: "TechCorp Office", lat: 19.070, lng: 72.870, radius: 400 },
      { id: "gf-1c", name: "Apex Retail Plaza", lat: 19.085, lng: 72.885, radius: 350 },
    ],
    route: [
      { lat: 19.050, lng: 72.850, time: "09:00 AM", speed: "0 km/h", status: "Checked In at Residence" },
      { lat: 19.054, lng: 72.853, time: "09:15 AM", speed: "32 km/h", status: "Entering Mumbai North HQ Geofence" },
      { lat: 19.056, lng: 72.856, time: "09:30 AM", speed: "12 km/h", status: "Meeting at HQ Office" },
      { lat: 19.062, lng: 72.861, time: "10:00 AM", speed: "45 km/h", status: "En-route to client site" },
      { lat: 19.069, lng: 72.868, time: "10:30 AM", speed: "25 km/h", status: "Approaching TechCorp Office" },
      { lat: 19.071, lng: 72.871, time: "11:00 AM", speed: "0 km/h", status: "Client Presentation (Inside TechCorp)" },
      { lat: 19.078, lng: 72.879, time: "11:45 AM", speed: "50 km/h", status: "En-route to next stop" },
      { lat: 19.084, lng: 72.883, time: "12:15 PM", speed: "15 km/h", status: "Entering Apex Plaza Geofence" },
      { lat: 19.086, lng: 72.887, time: "12:30 PM", speed: "5 km/h", status: "Retail Partner Audit" },
      { lat: 19.076, lng: 72.877, time: "01:00 PM", speed: "0 km/h", status: "Lunch Break (Current Location)" },
    ],
  },
  "2": {
    employeeId: "2",
    employeeName: "Priya Patel",
    avatar: "PP",
    role: "Delivery Staff",
    geofences: [
      { id: "gf-2a", name: "South Delivery Hub", lat: 18.950, lng: 72.825, radius: 400 },
      { id: "gf-2b", name: "Customer Site A", lat: 18.960, lng: 72.830, radius: 300 },
      { id: "gf-2c", name: "Marine Drive Warehouse", lat: 18.940, lng: 72.815, radius: 500 },
    ],
    route: [
      { lat: 18.938, lng: 72.812, time: "09:30 AM", speed: "5 km/h", status: "Loading Shipments at Warehouse" },
      { lat: 18.942, lng: 72.816, time: "09:45 AM", speed: "40 km/h", status: "En-route to Hub" },
      { lat: 18.949, lng: 72.824, time: "10:00 AM", speed: "18 km/h", status: "Sorting packages at Delivery Hub" },
      { lat: 18.953, lng: 72.827, time: "10:30 AM", speed: "30 km/h", status: "Dispatching order #992" },
      { lat: 18.959, lng: 72.831, time: "11:00 AM", speed: "0 km/h", status: "Delivered package at Customer Site A" },
      { lat: 18.965, lng: 72.839, time: "11:30 AM", speed: "35 km/h", status: "En-route back south" },
      { lat: 18.961, lng: 72.835, time: "12:00 PM", speed: "22 km/h", status: "Awaiting next dispatch (Current Location)" },
    ],
  },
  "4": {
    employeeId: "4",
    employeeName: "Kavya Nair",
    avatar: "KN",
    role: "Marketing Executive",
    geofences: [
      { id: "gf-4a", name: "Pune Corporate Park", lat: 18.515, lng: 73.845, radius: 800 },
      { id: "gf-4b", name: "Kothrud Agency Zone", lat: 18.505, lng: 73.820, radius: 600 },
    ],
    route: [
      { lat: 18.498, lng: 73.810, time: "08:55 AM", speed: "0 km/h", status: "Checked In" },
      { lat: 18.503, lng: 73.818, time: "09:20 AM", speed: "28 km/h", status: "Entering Kothrud Zone" },
      { lat: 18.506, lng: 73.822, time: "09:50 AM", speed: "5 km/h", status: "Conducting Agency Interview" },
      { lat: 18.511, lng: 73.835, time: "10:30 AM", speed: "42 km/h", status: "En-route to Corporate Park" },
      { lat: 18.514, lng: 73.843, time: "11:00 AM", speed: "10 km/h", status: "Pitching Campaign to B2B Partner" },
      { lat: 18.520, lng: 73.856, time: "11:45 AM", speed: "0 km/h", status: "Reviewing Reports at Cafe (Current Location)" },
    ],
  },
  "5": {
    employeeId: "5",
    employeeName: "Ravi Kumar",
    avatar: "RK",
    role: "Surveyor",
    geofences: [
      { id: "gf-5a", name: "Belapur Terminal Zone", lat: 19.020, lng: 73.018, radius: 700 },
      { id: "gf-5b", name: "Nerul Sector 15 Site", lat: 19.035, lng: 73.025, radius: 500 },
    ],
    route: [
      { lat: 19.015, lng: 73.010, time: "09:10 AM", speed: "10 km/h", status: "Arrived at Belapur Station" },
      { lat: 19.019, lng: 73.016, time: "09:40 AM", speed: "2 km/h", status: "Performing Ground Survey" },
      { lat: 19.023, lng: 73.021, time: "10:20 AM", speed: "15 km/h", status: "Leaving Belapur Terminal" },
      { lat: 19.030, lng: 73.026, time: "11:00 AM", speed: "30 km/h", status: "Arriving at Nerul Sector 15 Site" },
      { lat: 19.033, lng: 73.029, time: "11:30 AM", speed: "0 km/h", status: "Mapping Coordinates (Current Location)" },
    ],
  },
  "8": {
    employeeId: "8",
    employeeName: "Ananya Roy",
    avatar: "AR",
    role: "Healthcare Worker",
    geofences: [
      { id: "gf-8a", name: "Fort Clinic", lat: 18.970, lng: 72.825, radius: 300 },
      { id: "gf-8b", name: "Byculla Ward Center", lat: 18.985, lng: 72.835, radius: 400 },
    ],
    route: [
      { lat: 18.968, lng: 72.822, time: "10:15 AM", speed: "15 km/h", status: "Clinic Check-in" },
      { lat: 18.971, lng: 72.826, time: "10:45 AM", speed: "4 km/h", status: "Patient Consultation (Fort Clinic)" },
      { lat: 18.978, lng: 72.829, time: "11:15 AM", speed: "25 km/h", status: "Visiting Ward Patients" },
      { lat: 18.983, lng: 72.833, time: "11:45 AM", speed: "5 km/h", status: "Arrived at Byculla Ward Center" },
      { lat: 18.980, lng: 72.830, time: "12:15 PM", speed: "0 km/h", status: "Logging Medical Reports (Current Location)" },
    ],
  },
};
