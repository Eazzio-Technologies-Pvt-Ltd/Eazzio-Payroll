# 🔐 Security & Compliance

Enterprise-grade security practices for Eazzio Payroll.

---

## Authentication Security

### JWT Implementation

```javascript
// Token generation
const token = jwt.sign(
  { userId, role, exp: Math.floor(Date.now() / 1000) + 86400 },
  process.env.JWT_SECRET,
  { algorithm: 'HS256' }
);

// Token verification
jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
  if (err) throw new UnauthorizedError();
  req.user = decoded;
});
```

### Password Security

```javascript
// Hash password (bcryptjs, 10 rounds)
const hash = await bcrypt.hash(password, 10);

// Verify password
const isValid = await bcrypt.compare(password, storedHash);

// Requirements:
// - Minimum 8 characters
// - Uppercase, lowercase, numbers, special chars
// - Never stored in plain text
// - Never logged
```

### Token Refresh Flow

```
1. User logs in
   → Get access token (expires 1 hour)
   → Get refresh token (expires 7 days)

2. Access token expires
   → Use refresh token
   → Get new access token
   → Refresh token invalidated

3. Refresh token expires
   → User must login again
```

---

## Authorization (RBAC)

### Role Hierarchy

```
ADMIN
└── Full system access
└── Can manage users, teams, settings
└── Can view all reports
└── Can perform all operations

MANAGER
└── Team-level access
└── Can manage own team members
└── Can view team reports
└── Can approve leave/expenses

FIELD_STAFF
└── Personal access only
└── Can view own data
└── Can submit attendance/tasks
└── Can request leave/expenses
```

### Authorization Middleware

```javascript
// Check role
const authorize = (allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenError('Insufficient permissions');
    }
    next();
  };
};

// Check data ownership
const checkOwnership = async (req, res, next) => {
  const resource = await getResource(req.params.id);
  if (resource.userId !== req.user.id && req.user.role !== 'ADMIN') {
    throw new ForbiddenError('Cannot access resource');
  }
  next();
};
```

---

## Data Protection

### Encryption at Rest

```
Database:
- Sensitive columns encrypted
- PII: SSN, BankAccount, Phone
- Encryption: AES-256
- Managed by PostgreSQL

Connection:
- Force SSL/TLS
- sslmode=require
```

### Encryption in Transit

```
HTTPS/TLS 1.3:
- All API traffic encrypted
- Certificate: Let's Encrypt (free)
- Auto-renewal: enabled
- HSTS header: enabled
- Cipher suites: modern only
```

### Data Masking

```javascript
// Response filtering
const sanitizeUser = (user) => {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    // Never include:
    // - passwordHash
    // - refreshToken
    // - bankAccount (except last 4 digits)
    // - SSN (except last 4 digits)
  };
};
```

---

## API Security

### Rate Limiting

```javascript
// Configure per endpoint
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // requests per window
  keyGenerator: (req) => req.user?.id || req.ip,
  handler: () => throw new TooManyRequestsError()
});

// Stricter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5 // 5 attempts per minute
});

app.post('/auth/login', authLimiter, loginHandler);
```

### Input Validation

```javascript
// Joi validation
const schema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  phone: Joi.string().pattern(/^\d{10}$/).optional()
});

const validate = (data) => {
  const { error, value } = schema.validate(data);
  if (error) throw new ValidationError(error.details);
  return value;
};
```

### SQL Injection Prevention

```javascript
// Using Prisma (prevents SQL injection)
const user = await prisma.user.findUnique({
  where: { email: userInput }
});

// Never use raw queries
// Bad: `SELECT * FROM users WHERE email = '${email}'`
// Good: Prisma parameterized queries
```

### CORS Configuration

```javascript
const corsOptions = {
  origin: [
    'https://eazzio.com',
    'https://app.eazzio.com',
    'http://localhost:3000' // dev only
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400
};

app.use(cors(corsOptions));
```

### Security Headers

```javascript
// Helmet.js
const helmet = require('helmet');

app.use(helmet());
// Sets:
// - X-Content-Type-Options: nosniff
// - X-Frame-Options: DENY
// - X-XSS-Protection: 1; mode=block
// - Strict-Transport-Security: max-age=31536000
// - Content-Security-Policy: ...
```

---

## Audit Logging

### What to Log

```javascript
const auditLog = {
  userId: 'user_123',
  action: 'UPDATE_USER',
  resourceType: 'USER',
  resourceId: 'user_456',
  changes: {
    email: { old: 'old@email.com', new: 'new@email.com' },
    role: { old: 'STAFF', new: 'MANAGER' }
  },
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0...',
  timestamp: '2026-06-12T10:00:00Z',
  status: 'SUCCESS' | 'FAILURE'
};

// Stored in AuditLog table
await prisma.auditLog.create({ data: auditLog });
```

### Compliance Reports

```
Required for:
- GDPR (data access requests)
- Tax audit
- Security investigation
- Employee disputes

Retention: 7 years
Access: Admin and legal team only
```

---

## Mobile Security

### Secure Storage

```dart
// Never store sensitive data in SharedPreferences
// Use secure storage for:
// - JWT tokens
// - Refresh tokens
// - User passwords
// - API keys

final storage = FlutterSecureStorage();
await storage.write(
  key: 'auth_token',
  value: token,
  iOptions: IOSOptions(
    accessibility: KeychainAccessibility.first_available_this_device_only
  )
);
```

### Certificate Pinning

```dart
// Prevent man-in-the-middle attacks
final client = HttpClient();
client.badCertificateCallback = (cert, host, port) {
  // Verify certificate hash
  return verifyCertificatePinning(cert);
};
```

### Biometric Authentication

```dart
// Support fingerprint/face recognition
final localAuth = LocalAuthentication();
final isAuthenticated = await localAuth.authenticate(
  localizedReason: 'Authenticate to access app',
  options: AuthenticationOptions(
    stickyAuth: true,
    biometricOnly: true
  )
);
```

---

## Compliance

### GDPR Compliance

```
✓ Data collection consent
✓ Privacy policy (public)
✓ Data access requests (30 days)
✓ Data deletion (30 days)
✓ Data portability (export as JSON)
✓ Breach notification (72 hours)
✓ Data Processing Agreement (signed)
✓ Audit logging (retention: 3 years)
```

### Data Retention Policy

```
- Active User Data: Indefinite (until deletion)
- Inactive User Data: 2 years then anonymize
- Location Data: 6 months (then archive)
- Attendance Data: 7 years (legal requirement)
- AuditLog: 7 years (legal requirement)
- Backup Data: Encrypted, 30-day retention
```

### Security Standards

```
✓ ISO 27001 (Information Security)
✓ SOC 2 Type II (Security, Availability, Integrity)
✓ PCI DSS (if handling payments)
✓ HIPAA (if handling health data)
✓ GDPR (if serving EU users)
✓ CCPA (if serving California users)
```

---

## Incident Response

### Security Incident Procedure

```
1. DETECT
   - Monitor alerts
   - Review logs
   - User reports

2. ASSESS
   - Severity level
   - Affected data
   - Affected users

3. RESPOND
   - Contain breach
   - Notify users (if required)
   - Block malicious access
   - Preserve evidence

4. REMEDIATE
   - Fix vulnerability
   - Change credentials
   - Update logs
   - Post-mortem analysis

5. DOCUMENT
   - Incident report
   - Timeline
   - Lessons learned
   - Prevention measures
```

### Contact Information

```
Security Issues: security@eazzio.com
Response time: < 24 hours
Escalation: CISO + Legal team
```

---

## Regular Security Tasks

### Daily

- [ ] Monitor error logs for anomalies
- [ ] Check failed login attempts
- [ ] Review API rate limiting hits
- [ ] Verify database connectivity

### Weekly

- [ ] Review access logs
- [ ] Check for failed authentication patterns
- [ ] Verify backups completed
- [ ] Review security alerts

### Monthly

- [ ] Penetration testing
- [ ] Dependency updates
- [ ] Security patch verification
- [ ] Audit log review

### Quarterly

- [ ] Security assessment
- [ ] Compliance audit
- [ ] Team training
- [ ] Policy review

### Annually

- [ ] Full security audit
- [ ] Certification renewal
- [ ] Incident review
- [ ] Disaster recovery test

---

## Security Checklist

### Before Production

- [ ] Environment variables set
- [ ] Secrets not in code
- [ ] SSL/TLS configured
- [ ] Rate limiting enabled
- [ ] Input validation complete
- [ ] CORS configured
- [ ] Security headers set
- [ ] HTTPS enforced
- [ ] Passwords hashed (bcrypt 10 rounds)
- [ ] JWT properly configured
- [ ] Audit logging enabled
- [ ] Database encrypted
- [ ] Backups encrypted
- [ ] Logging configured
- [ ] Error handling secure
- [ ] Dependencies updated
- [ ] No debug mode enabled
- [ ] Admin accounts secured
- [ ] Monitoring configured
- [ ] Incident response plan ready

---

<div align="center">

**Last Updated:** June 12, 2026  

[Back to Documentation Index](./README.md)

</div>
