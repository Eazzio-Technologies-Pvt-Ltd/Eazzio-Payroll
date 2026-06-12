# 🤝 Contributing Guidelines

How to contribute to Eazzio Payroll development.

---

## Getting Started

### Prerequisites

- GitHub account
- Git installed and configured
- Node.js 18+
- Code editor (VS Code recommended)
- Familiarity with JavaScript/TypeScript, React, Flutter

### Development Setup

```bash
# Fork the repository
# Clone your fork
git clone https://github.com/YOUR_USERNAME/Eazzio-Payroll.git

# Add upstream remote
git remote add upstream https://github.com/eazzio/Eazzio-Payroll.git

# Create feature branch
git checkout -b feature/feature-name
```

---

## Code Style & Standards

### JavaScript/TypeScript

```javascript
// ✓ Good
const getUserById = async (id: string): Promise<User> => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new NotFoundError('User not found');
  return user;
};

// ✗ Bad
const getUser = async (id) => {
  let user = await db.user.find(id);
  if (user == null) return null;
  return user;
};

// Naming conventions
const CONSTANTS_IN_UPPERCASE = 'value';
const functionNamesInCamelCase = () => {};
const ClassNamesInPascalCase = class {};
const variableNamesInCamelCase = 'value';
```

### React Components

```typescript
// ✓ Good
interface UserCardProps {
  userId: string;
  onEdit?: (id: string) => void;
}

const UserCard: React.FC<UserCardProps> = ({ userId, onEdit }) => {
  const [user, setUser] = useState<User | null>(null);
  
  useEffect(() => {
    fetchUser(userId).then(setUser);
  }, [userId]);

  return (
    <div className="user-card">
      <h3>{user?.name}</h3>
      {onEdit && <button onClick={() => onEdit(userId)}>Edit</button>}
    </div>
  );
};

export default UserCard;
```

### Flutter/Dart

```dart
// ✓ Good
class UserProvider extends ChangeNotifier {
  final ApiService _apiService;
  late User _user;
  
  UserProvider({required ApiService apiService})
      : _apiService = apiService;
  
  Future<void> fetchUser(String id) async {
    try {
      _user = await _apiService.getUser(id);
      notifyListeners();
    } on ApiException catch (e) {
      rethrow;
    }
  }
  
  User get user => _user;
}
```

---

## Git Workflow

### Branch Naming

```bash
# Feature branch
git checkout -b feature/description-of-feature

# Bug fix branch
git checkout -b bugfix/description-of-bug

# Documentation
git checkout -b docs/description

# Hotfix (production)
git checkout -b hotfix/description
```

### Commit Messages

```bash
# Format: [TYPE] Short description
git commit -m "feat: Add user authentication endpoint"
git commit -m "fix: Resolve location tracking issue"
git commit -m "refactor: Simplify attendance logic"
git commit -m "docs: Update API documentation"
git commit -m "test: Add unit tests for auth service"

# Types: feat, fix, refactor, docs, test, perf, style, ci, chore
```

### Pull Request Process

```bash
# 1. Update with latest changes
git fetch upstream
git rebase upstream/main

# 2. Push to your fork
git push origin feature/feature-name

# 3. Create PR on GitHub
# - Title: Clear and descriptive
# - Description: What, why, how
# - Reference: Link to issues if applicable
# - Checks: All tests must pass

# 4. Address review comments
# - Make changes
# - Push updates (automatic PR update)
# - Mark conversation as resolved

# 5. Merge
# - Squash and merge (for clean history)
# - Delete branch after merge
```

---

## Testing Requirements

### Backend Tests

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Coverage report
npm run test:coverage

# Test format
describe('UserService', () => {
  it('should fetch user by ID', async () => {
    const user = await userService.getUserById('user_123');
    expect(user.id).toBe('user_123');
  });
});
```

### Frontend Tests

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Component tests
npm run test:components
```

### Mobile Tests

```bash
# Unit tests
flutter test

# Integration tests
flutter drive --target=test_driver/app.dart

# Build tests
flutter build apk --debug
```

---

## Code Review Guidelines

### For Reviewers

- [ ] Code follows style guide
- [ ] All tests pass
- [ ] No hardcoded values
- [ ] Proper error handling
- [ ] Performance acceptable
- [ ] Documentation updated
- [ ] Security considerations

### For Contributors

- Keep PRs focused (one feature per PR)
- Write clear commit messages
- Add tests for new features
- Update documentation
- Request review from maintainers
- Be responsive to feedback

---

## Documentation Standards

### Code Comments

```javascript
// ✓ Good
/**
 * Fetches user by ID from database
 * @param {string} id - User ID (UUID format)
 * @returns {Promise<User>} User object
 * @throws {NotFoundError} If user doesn't exist
 */
async function getUserById(id: string): Promise<User> {
  // Query with validation
  const user = await prisma.user.findUnique({ where: { id } });
  
  if (!user) {
    throw new NotFoundError(`User ${id} not found`);
  }
  
  return user;
}

// ✗ Bad
function getUser(id) {
  // get the user
  return db.user.find(id);
}
```

### README Updates

When adding features, update:
- Feature list
- API endpoints
- Configuration options
- Examples/usage
- Changelog

---

## Performance Considerations

### Frontend

```typescript
// ✓ Use useMemo for expensive calculations
const memoizedValue = useMemo(() => {
  return calculateExpensiveValue(data);
}, [data]);

// ✓ Lazy load components
const LazyComponent = lazy(() => import('./Component'));

// ✗ Avoid inline function definitions
// ✗ Avoid unnecessary state updates
```

### Backend

```javascript
// ✓ Use database indexes for queries
CREATE INDEX idx_user_email ON users(email);

// ✓ Implement caching strategy
const user = await cache.get('user:123') || 
             await database.getUser('123');

// ✗ Don't query entire table for single record
// ✗ Don't load related data unnecessarily
```

---

## Security Best Practices

### Input Validation

```javascript
// Always validate and sanitize
const schema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required()
});

const { error, value } = schema.validate(input);
if (error) throw new ValidationError(error);
```

### Authentication

```javascript
// Use middleware for protected routes
app.get('/api/user', authenticateToken, getUserHandler);

// Never expose sensitive data
const sanitizeUser = (user) => {
  const { passwordHash, refreshToken, ...safe } = user;
  return safe;
};
```

### SQL Injection Prevention

```javascript
// Use Prisma (prevents SQL injection)
const user = await prisma.user.findUnique({
  where: { email: userEmail }
});

// Never concatenate user input into queries
```

---

## Bug Reporting

### Issue Template

```markdown
## Description
Brief description of the bug

## Steps to Reproduce
1. Go to...
2. Click on...
3. Observe...

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- OS: [e.g., macOS]
- Browser: [e.g., Chrome]
- Version: [e.g., 2.0.0]

## Screenshots/Logs
[If applicable]

## Suggested Fix
[If you have ideas]
```

---

## Feature Request Template

```markdown
## Description
What feature would you like?

## Use Case
Why do you need this?

## Proposed Solution
How should it work?

## Alternatives Considered
Other approaches?

## Additional Context
Any other details?
```

---

## Release Process

### Version Numbering

- **Major** (X.0.0): Breaking changes
- **Minor** (1.X.0): New features
- **Patch** (1.0.X): Bug fixes

### Release Checklist

- [ ] All tests pass
- [ ] Documentation updated
- [ ] Changelog updated
- [ ] Version number bumped
- [ ] Tag created
- [ ] Release notes written
- [ ] Deployed to staging
- [ ] Deployed to production
- [ ] Announcement sent

---

## Development Tools

### Recommended

- **Editor**: VS Code
- **Database UI**: Prisma Studio
- **API Testing**: Postman/Insomnia
- **Version Control**: GitHub Desktop
- **Package Manager**: npm/yarn

### Browser Extensions

- React DevTools
- Redux DevTools
- Vue DevTools (if applicable)

---

## Community

### Communication

- **GitHub Issues**: Bug reports, feature requests
- **Discussions**: Questions, ideas
- **Pull Requests**: Code contributions
- **Email**: support@eazzio.com

### Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Accept criticism gracefully
- Help new contributors
- Report inappropriate behavior

---

## Resources

- **Documentation**: See docs/ folder
- **API Docs**: [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- **Architecture**: [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Setup Guide**: [SETUP_GUIDE.md](./SETUP_GUIDE.md)

---

## Common Issues

### Port Already in Use

```bash
# Find and kill process
lsof -i :5000
kill -9 <PID>
```

### Database Connection Error

```bash
# Verify connection string
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

### Module Not Found

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

---

## Asking for Help

1. Check existing issues/discussions
2. Search documentation
3. Read error messages carefully
4. Provide minimal reproduction
5. Include relevant logs/screenshots
6. Be specific about your setup

---

<div align="center">

**Thank you for contributing! 🙌**

**Last Updated:** June 12, 2026  

[Back to Documentation Index](./README.md)

</div>
