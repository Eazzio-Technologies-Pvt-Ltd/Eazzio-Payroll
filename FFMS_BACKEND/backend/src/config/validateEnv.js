/**
 * Environment Variable Validation
 * Runs at startup to ensure all required secrets are configured
 * and no placeholder values are being used in production.
 */

const validateEnv = () => {
  const required = [
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'DATABASE_URL',
    'REDIS_URL',
  ];

  const placeholderPatterns = ['change-this', 'your-super-secret', 'replace-me', 'todo'];
  const errors = [];

  for (const key of required) {
    if (!process.env[key]) {
      errors.push(`FATAL: ${key} is not set.`);
      continue;
    }

    // Check for placeholder values
    const value = process.env[key].toLowerCase();
    for (const pattern of placeholderPatterns) {
      if (value.includes(pattern)) {
        errors.push(`FATAL: ${key} appears to use a placeholder value ("${pattern}" detected).`);
        break;
      }
    }
  }

  // Check for CLI prefix in REDIS_URL (common mistake)
  if (process.env.REDIS_URL && process.env.REDIS_URL.startsWith('redis-cli')) {
    errors.push('FATAL: REDIS_URL contains "redis-cli" CLI command prefix. Use the connection URI only.');
  }

  if (errors.length > 0) {
    console.error('\n══════════════════════════════════════════════════');
    console.error('  ENVIRONMENT VALIDATION FAILED');
    console.error('══════════════════════════════════════════════════');
    errors.forEach(err => console.error(`  ✖ ${err}`));
    console.error('══════════════════════════════════════════════════\n');
    process.exit(1);
  }
};

module.exports = validateEnv;
