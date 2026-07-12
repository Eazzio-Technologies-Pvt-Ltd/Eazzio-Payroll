// lib/utils.ts
export function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(" ");
}

export function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function getStatusColor(status: string) {
  switch (status) {
    case "present": return "badge-green";
    case "absent": return "badge-red";
    case "late": return "badge-orange";
    case "active": return "badge-green";
    case "inactive": return "badge-red";
    case "completed": return "badge-green";
    case "in-progress": return "badge-blue";
    case "pending": return "badge-orange";
    case "high": return "badge-red";
    case "medium": return "badge-orange";
    case "low": return "badge-blue";
    default: return "badge-blue";
  }
}
