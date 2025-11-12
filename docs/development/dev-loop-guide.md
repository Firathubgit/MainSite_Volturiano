# Developer Workflow Guide

**Purpose**: Step-by-step guide for daily development workflow  
**Audience**: All developers working on the VOLTURIANO project  
**Last Updated**: 2025-01-XX

---

## Table of Contents

1. [Initial Setup](#initial-setup)
2. [Daily Workflow](#daily-workflow)
3. [Feature Development](#feature-development)
4. [Database Changes](#database-changes)
5. [API Development](#api-development)
6. [UI Development](#ui-development)
7. [Testing](#testing)
8. [Code Review](#code-review)
9. [Deployment](#deployment)
10. [Troubleshooting](#troubleshooting)

---

## Initial Setup

### Prerequisites

- Node.js 18+ installed
- Git installed
- VS Code (recommended) or your preferred editor
- Supabase CLI installed (`npm install -g supabase`)

### Step 1: Clone Repository

```bash
git clone <repository-url>
cd MainSite_Volturiano
```

### Step 2: Install Dependencies

```bash
cd web
npm install
```

### Step 3: Environment Variables

Create `.env.local` in `web/` directory:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_ENABLE_WORLD=true
VITE_ENABLE_INVEST=false
```

**Note**: Get these values from Supabase Dashboard → Settings → API

### Step 4: Local Supabase Setup (Optional)

```bash
# Initialize local Supabase
supabase init

# Start local Supabase
supabase start

# Link to remote project (for migrations)
supabase link --project-ref your-project-ref
```

### Step 5: Verify Setup

```bash
# Start dev server
cd web
npm run dev

# Should open http://localhost:5173
```

**Checklist**:
- [ ] Dev server starts without errors
- [ ] Can access homepage
- [ ] Can log in (if Supabase configured)
- [ ] No console errors

---

## Daily Workflow

### Morning Routine

1. **Pull Latest Changes**
   ```bash
   git pull origin develop
   ```

2. **Check for Migrations**
   ```bash
   # If new migrations exist
   supabase db pull
   ```

3. **Start Dev Server**
   ```bash
   cd web
   npm run dev
   ```

4. **Check for Issues**
   - Review GitHub issues/PRs
   - Check Slack/Discord for updates
   - Review TODO.txt for priorities

### Development Session

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Write code
   - Test locally
   - Commit frequently

3. **Before Committing**
   ```bash
   # Lint code
   npm run lint

   # Check types (if TypeScript)
   npm run type-check

   # Run tests
   npm test
   ```

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add feature description"
   ```

**Commit Message Format**:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `style:` - Formatting
- `refactor:` - Code refactoring
- `test:` - Tests
- `chore:` - Maintenance

### End of Day

1. **Push Changes**
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create Pull Request**
   - Go to GitHub
   - Create PR from feature branch to `develop`
   - Fill out PR template
   - Request review

3. **Clean Up**
   - Stop dev server
   - Close unnecessary tabs
   - Update TODO.txt if needed

---

## Feature Development

### Step 1: Planning

1. **Review Requirements**
   - Read feature spec
   - Understand user needs
   - Identify dependencies

2. **Design Approach**
   - Sketch component structure
   - Plan data flow
   - Identify API endpoints needed

3. **Check Existing Code**
   - Look for similar features
   - Reuse existing patterns
   - Check for conflicts

### Step 2: Database Changes (If Needed)

1. **Design Schema**
   - Define tables/columns
   - Plan indexes
   - Design RLS policies

2. **Create Migration**
   ```bash
   # Create migration file
   supabase migration new feature_name
   ```

3. **Write SQL**
   - Add to migration file
   - Include rollback script
   - Test locally

4. **Test Migration**
   ```bash
   # Reset local DB
   supabase db reset

   # Verify tables created
   supabase db diff
   ```

### Step 3: API Development

1. **Create API Functions**
   - Location: `web/src/features/[feature]/api.js`
   - Follow existing patterns
   - Add error handling
   - Add logging

2. **Test API**
   - Test in browser console
   - Test error cases
   - Verify RLS policies

### Step 4: State Management

1. **Create/Update Store**
   - Location: `web/src/stores/[feature]Store.js`
   - Use Zustand pattern
   - Add optimistic updates
   - Add error handling

2. **Test Store**
   - Test actions
   - Test selectors
   - Test error cases

### Step 5: UI Components

1. **Create Components**
   - Location: `web/src/features/[feature]/components/`
   - Follow component patterns
   - Use CSS Modules
   - Add i18n keys

2. **Style Components**
   - Use design tokens
   - Follow style guide
   - Make responsive
   - Test accessibility

3. **Integrate Components**
   - Add to page/route
   - Connect to store
   - Add error boundaries

### Step 6: Testing

1. **Write Tests**
   - Unit tests for utilities
   - Component tests
   - Integration tests
   - E2E tests (if critical)

2. **Run Tests**
   ```bash
   npm test
   ```

3. **Fix Issues**
   - Fix failing tests
   - Improve coverage
   - Document edge cases

### Step 7: Documentation

1. **Update Docs**
   - Add feature docs
   - Update API docs
   - Update README if needed

2. **Update TODO.txt**
   - Mark completed items
   - Add new items if discovered

---

## Database Changes

### Creating Migrations

1. **Create Migration File**
   ```bash
   supabase migration new descriptive_name
   ```

2. **Write SQL**
   ```sql
   -- Migration: add_new_table
   -- Up migration
   create table new_table (
     id uuid primary key,
     ...
   );

   -- Down migration (rollback)
   drop table if exists new_table;
   ```

3. **Test Locally**
   ```bash
   # Apply migration
   supabase db reset

   # Test rollback
   supabase migration repair --status reverted
   ```

### Applying Migrations

**Local**:
```bash
supabase db reset
```

**Staging**:
```bash
supabase db push --db staging
```

**Production**:
- Create PR with migration
- Get approval
- Deploy via Supabase Dashboard or CLI

### Best Practices

1. **Always Include Rollback**
   - Write down migration
   - Test rollback locally

2. **Test on Staging First**
   - Never apply directly to production
   - Test with real data

3. **Backup Before Production**
   - Supabase auto-backups
   - Manual backup for major changes

4. **Document Changes**
   - Add migration notes
   - Update schema docs
   - Notify team

---

## API Development

### Function Structure

```javascript
/**
 * Brief description
 * @param {Type} param - Description
 * @returns {Promise<{data, error}>}
 */
export async function functionName(param) {
  // 1. Validate input
  if (!param) {
    return { data: null, error: new Error('Param required') };
  }

  // 2. Get client
  const { client, error: clientError } = ensureClient();
  if (clientError) return { data: null, error: clientError };

  // 3. Make request
  try {
    const { data, error } = await client
      .from('table')
      .select('*')
      .eq('id', param);

    if (error) throw error;

    return { data, error: null };
  } catch (err) {
    console.error('[API] Error:', err);
    return { data: null, error: err };
  }
}
```

### Error Handling

**Always**:
- Return `{data, error}` structure
- Log errors with context
- Handle network errors
- Handle RLS errors

**Never**:
- Throw unhandled errors
- Expose sensitive data
- Ignore errors silently

### RLS Testing

**Test RLS**:
```javascript
// Test as user A
const userA = await supabase.auth.signInWithPassword({...});

// Test as user B
const userB = await supabase.auth.signInWithPassword({...});

// Verify user A can't see user B's data
```

---

## UI Development

### Component Structure

```jsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useFeatureStore } from '../../../stores/featureStore';
import styles from './Component.module.css';

/**
 * Component description
 * @param {Object} props - Component props
 */
export default function Component({ prop1, prop2 }) {
  const { t } = useTranslation('namespace');
  const { state, action } = useFeatureStore();

  const handleClick = () => {
    // Handle click
  };

  return (
    <div className={styles.container}>
      {/* Component JSX */}
    </div>
  );
}
```

### Styling Guidelines

1. **Use CSS Modules**
   - One module per component
   - Scoped styles
   - No global styles (except tokens)

2. **Use Design Tokens**
   - Colors from `variables.css`
   - Spacing from tokens
   - Typography from tokens

3. **Follow Patterns**
   - Check existing components
   - Reuse styles
   - Maintain consistency

### i18n Integration

1. **Add Keys**
   - Add to `web/src/i18n/en/namespace.json`
   - Add to `web/src/i18n/sv/namespace.json`

2. **Use in Components**
   ```jsx
   const { t } = useTranslation('namespace');
   <h1>{t('key')}</h1>
   ```

3. **Test Translations**
   - Switch language
   - Verify all text translated
   - Check for missing keys

---

## Testing

### Unit Tests

**Location**: `web/src/__tests__/`

**Example**:
```javascript
import { describe, it, expect } from 'vitest';
import { functionToTest } from '../utils/helper';

describe('functionToTest', () => {
  it('should do something', () => {
    const result = functionToTest(input);
    expect(result).toBe(expected);
  });
});
```

### Component Tests

**Example**:
```javascript
import { render, screen } from '@testing-library/react';
import Component from '../Component';

describe('Component', () => {
  it('should render', () => {
    render(<Component />);
    expect(screen.getByText('Text')).toBeInTheDocument();
  });
});
```

### E2E Tests

**Location**: `web/e2e/`

**Example**:
```javascript
import { test, expect } from '@playwright/test';

test('user can save configuration', async ({ page }) => {
  await page.goto('/configurator');
  await page.click('[data-testid="save-button"]');
  await expect(page.locator('.success-message')).toBeVisible();
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run in watch mode
npm test -- --watch

# Run with coverage
npm test -- --coverage

# Run E2E tests
npm run test:e2e
```

---

## Code Review

### Before Submitting PR

**Checklist**:
- [ ] Code follows project conventions
- [ ] All tests pass
- [ ] No console errors
- [ ] No linting errors
- [ ] Documentation updated
- [ ] i18n keys added
- [ ] Accessibility checked
- [ ] Performance acceptable

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation

## Testing
How was this tested?

## Screenshots (if applicable)

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings
```

### Review Process

1. **Self-Review**
   - Review your own code
   - Fix obvious issues
   - Test thoroughly

2. **Request Review**
   - Assign reviewers
   - Add context
   - Respond to feedback

3. **Address Feedback**
   - Make requested changes
   - Discuss if disagree
   - Update PR

4. **Merge**
   - Get approval
   - Merge to `develop`
   - Delete branch

---

## Deployment

### Pre-Deployment Checklist

- [ ] All tests pass
- [ ] Migrations tested
- [ ] Environment variables set
- [ ] Build succeeds
- [ ] No console errors
- [ ] Performance acceptable

### Staging Deployment

1. **Merge to Develop**
   ```bash
   git checkout develop
   git pull
   git merge feature/your-feature
   ```

2. **Deploy to Staging**
   - Automatic via CI/CD
   - Or manual: `npm run build && deploy`

3. **Verify**
   - Check staging URL
   - Test critical flows
   - Check error logs

### Production Deployment

1. **Merge to Main**
   ```bash
   git checkout main
   git pull
   git merge develop
   git push
   ```

2. **Run Migrations**
   ```bash
   supabase db push --db production
   ```

3. **Deploy Frontend**
   - Automatic via CI/CD
   - Or manual deployment

4. **Verify**
   - Check production URL
   - Monitor error logs
   - Check analytics

5. **Rollback Plan**
   - Know how to rollback
   - Have rollback script ready
   - Test rollback procedure

---

## Troubleshooting

### Common Issues

**1. Supabase Connection Errors**
- Check environment variables
- Verify Supabase project is active
- Check network connection
- Verify RLS policies

**2. Build Errors**
- Clear `node_modules` and reinstall
- Check Node.js version
- Verify all dependencies installed
- Check for syntax errors

**3. RLS Policy Errors**
- Verify user is authenticated
- Check policy conditions
- Test with service role (admin)
- Review policy SQL

**4. Styling Issues**
- Check CSS Module imports
- Verify class names match
- Check for CSS conflicts
- Inspect computed styles

**5. i18n Missing Keys**
- Check console for warnings
- Verify keys in JSON files
- Check namespace matches
- Reload page

### Debugging Tips

1. **Use Browser DevTools**
   - Console for errors
   - Network tab for API calls
   - React DevTools for components
   - Redux DevTools for state (if used)

2. **Add Logging**
   ```javascript
   console.log('[Feature] Action:', action);
   console.log('[Feature] State:', state);
   ```

3. **Check Supabase Logs**
   - Dashboard → Logs
   - Check Edge Function logs
   - Check database logs

4. **Test in Isolation**
   - Create minimal test case
   - Isolate the problem
   - Test components separately

### Getting Help

1. **Check Documentation**
   - Read relevant docs
   - Check examples
   - Review similar code

2. **Ask Team**
   - Post in Slack/Discord
   - Tag relevant people
   - Provide context

3. **Search Issues**
   - Check GitHub issues
   - Search Stack Overflow
   - Check library docs

---

## Best Practices

### Code Quality

1. **Write Clean Code**
   - Meaningful variable names
   - Small, focused functions
   - DRY (Don't Repeat Yourself)
   - Comment complex logic

2. **Follow Conventions**
   - Use project patterns
   - Follow style guide
   - Use established utilities
   - Maintain consistency

3. **Handle Errors**
   - Always handle errors
   - Provide user feedback
   - Log for debugging
   - Don't crash silently

### Performance

1. **Optimize Renders**
   - Use React.memo when needed
   - Avoid unnecessary re-renders
   - Use proper keys in lists
   - Lazy load heavy components

2. **Optimize Queries**
   - Use indexes
   - Limit result sets
   - Cache when appropriate
   - Debounce rapid calls

3. **Monitor Performance**
   - Use Lighthouse
   - Check bundle size
   - Monitor API calls
   - Profile slow operations

### Security

1. **Never Expose Secrets**
   - No API keys in code
   - Use environment variables
   - Don't commit secrets
   - Use RLS policies

2. **Validate Input**
   - Validate on client
   - Validate on server
   - Sanitize user input
   - Use parameterized queries

3. **Follow Security Guidelines**
   - Read `.cursor/rules/04-security.md`
   - Follow OWASP guidelines
   - Keep dependencies updated
   - Report vulnerabilities

---

**End of Developer Workflow Guide**

