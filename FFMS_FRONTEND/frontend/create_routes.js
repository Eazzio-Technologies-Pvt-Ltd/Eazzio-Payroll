const fs = require('fs');
const path = require('path');

// All dashboard pages that need admin wrappers
// Skip 'dashboard' since admin has its own dashboard page
const routes = [
  'activities/customers',
  'activities/visits',
  'attendance',
  'employees',
  'employees/hierarchy',
  'expenses',
  'feedback',
  'forms',
  'geofencing',
  'insights/attendance-analytics',
  'insights/expense-audits',
  'insights/overview',
  'map',
  'notifications',
  'playback',
  'reports',
  'reports/compliance',
  'reports/productivity',
  'reports/travel-expenses',
  'settings/notifications',
  'settings/security-access',
  'settings/territory-setup',
  'settings/travel-policies',
  'settings/user-management',
  'tasks',
];

const adminDir = path.join(__dirname, 'app', '(admin)', 'admin');

// First, remove existing broken wrappers (employees, tasks, geofencing, map, notifications, settings/user-management)
const oldDirs = ['employees', 'tasks', 'geofencing', 'map', 'notifications', 'settings/user-management'];
oldDirs.forEach(d => {
  const p = path.join(adminDir, d, 'page.tsx');
  if (fs.existsSync(p)) {
    fs.unlinkSync(p);
    console.log('Removed old:', p);
  }
});

routes.forEach(route => {
  const targetDir = path.join(adminDir, route);
  fs.mkdirSync(targetDir, { recursive: true });

  // Use @/ alias instead of fragile relative imports
  const importPath = '@/app/(dashboard)/' + route + '/page';
  const exportName = route.replace(/[/-]/g, '_') + '_Page';

  const content = [
    "// Auto-generated admin wrapper — renders the dashboard page inside the admin layout",
    "import DashboardPage from '" + importPath + "';",
    "",
    "export default function Admin_" + exportName + "() {",
    "  return <DashboardPage />;",
    "}",
    ""
  ].join('\n');

  fs.writeFileSync(path.join(targetDir, 'page.tsx'), content);
  console.log('Created:', route);
});

console.log('\nDone! Created', routes.length, 'admin wrapper routes.');
