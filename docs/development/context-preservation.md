# Context Preservation Guide

**Purpose**: Guidelines for preserving knowledge and context for future developers  
**Audience**: All team members  
**Last Updated**: 2025-01-XX

---

## Table of Contents

1. [Documentation Standards](#documentation-standards)
2. [Code Comments](#code-comments)
3. [Commit Messages](#commit-messages)
4. [PR Descriptions](#pr-descriptions)
5. [Architecture Decision Records](#architecture-decision-records)
6. [Knowledge Transfer](#knowledge-transfer)

---

## Documentation Standards

### What to Document

**Always Document**:
- Architecture decisions and rationale
- Complex algorithms or business logic
- API contracts and data structures
- Database schema changes
- Integration points with external services
- Known limitations and workarounds
- Performance considerations
- Security implications

**Document Format**:
- Use Markdown for all documentation
- Include table of contents for long docs
- Use code examples where helpful
- Link to related documentation
- Keep docs up-to-date with code changes

### Where to Document

**Feature Documentation**:
- `docs/[feature-name]/feature-documentation.md` - Comprehensive feature docs
- `docs/[feature-name]/database-rationale.md` - Database design decisions
- `docs/[feature-name]/supabase-setup.md` - Setup instructions

**Architecture Documentation**:
- `docs/architecture/` - System architecture
- `.cursor/rules/` - Development patterns and rules

**How-To Guides**:
- `docs/how-to/` - Step-by-step guides
- `docs/development/` - Developer workflows

**API Documentation**:
- JSDoc comments in code
- `docs/api/` - API reference (future)

### Documentation Maintenance

**When to Update**:
- When adding new features
- When changing architecture
- When fixing bugs that reveal design issues
- When deprecating features
- Monthly review for accuracy

**Review Process**:
- Review docs during PR review
- Update docs when code changes
- Archive outdated docs (don't delete)
- Link to latest version

---

## Code Comments

### When to Comment

**Always Comment**:
- Complex algorithms or business logic
- Non-obvious code decisions
- Workarounds for bugs or limitations
- Performance optimizations
- Security considerations
- TODO items with context

**Don't Comment**:
- Obvious code (e.g., `x = 5`)
- Self-documenting code
- Comments that duplicate code

### Comment Format

**JSDoc for Functions**:
```javascript
/**
 * Fetches garage items with optional filters and pagination
 * @param {Object} filters - Filter options
 * @param {string} filters.state - State filter ('saved', 'purchased', etc.)
 * @param {string} filters.search - Search term (client-side filtered)
 * @param {Object} pagination - Pagination options
 * @param {number} pagination.page - Page number (1-based)
 * @param {number} pagination.pageSize - Items per page
 * @returns {Promise<{data: Array, error: Error|null, count: number}>}
 */
export async function fetchGarage(filters = {}, pagination = {}) {
  // Implementation
}
```

**Inline Comments**:
```javascript
// Use .is() for NULL checks (PostgREST requirement)
query = query.is('archived_at', null);

// Optimistic update: remove immediately, rollback on error
const newItems = new Map(state.items);
newItems.delete(itemId);
set({ items: newItems });
```

**TODO Comments**:
```javascript
// TODO: Implement edit modal (see Phase 2.3 in roadmap)
// TODO: Add pagination UI (currently loads all items)
// FIXME: This workaround needed until Supabase fixes RLS issue #123
```

### Comment Guidelines

1. **Explain Why, Not What**: Code shows what, comments explain why
2. **Keep Comments Updated**: Update comments when code changes
3. **Use Clear Language**: Write for future developers
4. **Link to Issues**: Reference GitHub issues or docs
5. **Remove Dead Code**: Don't comment out code, delete it

---

## Commit Messages

### Commit Message Format

**Structure**:
```
<type>: <subject>

<body>

<footer>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements

**Examples**:

```
feat: add date and price filtering to garage

- Add dateRange filter (7d, 30d, 90d, 1y)
- Add priceMin/priceMax filters
- Server-side filtering for efficiency
- Client-side search for instant feedback

Closes #123
```

```
fix: correct NULL comparison in garage queries

Use .is() instead of .eq() for archived_at NULL checks.
PostgREST requires .is() for proper NULL comparison.

Fixes #456
```

### Commit Message Guidelines

1. **Use Imperative Mood**: "Add feature" not "Added feature"
2. **Keep Subject < 50 chars**: Detailed explanation in body
3. **Explain What and Why**: Body explains context
4. **Reference Issues**: Link to GitHub issues
5. **One Logical Change**: One feature/fix per commit

---

## PR Descriptions

### PR Template

```markdown
## Description
Brief description of changes and motivation

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Refactoring

## Changes Made
- Change 1
- Change 2
- Change 3

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing completed

## Screenshots (if applicable)
[Add screenshots/GIFs]

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings
- [ ] Tests pass locally
- [ ] i18n keys added (if needed)
- [ ] Accessibility checked

## Related Issues
Closes #123
Related to #456

## Additional Context
Any additional information reviewers should know
```

### PR Description Guidelines

1. **Be Descriptive**: Explain what and why
2. **Include Context**: Link to issues, docs, discussions
3. **Show Examples**: Code snippets, screenshots
4. **List Changes**: Bullet points of what changed
5. **Document Testing**: How was it tested?

---

## Architecture Decision Records (ADRs)

### When to Create ADRs

**Create ADR For**:
- Major architectural decisions
- Technology choices
- Design pattern selections
- Significant trade-offs
- Decisions that affect multiple features

**Don't Create ADR For**:
- Minor implementation details
- Obvious choices
- Temporary decisions

### ADR Format

**Location**: `docs/architecture/decisions/`

**Template**:
```markdown
# ADR-001: Use Zustand for State Management

## Status
Accepted

## Context
We need a state management solution for the React app.
Options considered: Redux, Zustand, Context API, Jotai.

## Decision
We will use Zustand for state management.

## Consequences

### Positive
- Minimal boilerplate
- Fine-grained subscriptions
- Small bundle size
- Simple mental model

### Negative
- Less ecosystem than Redux
- Newer library (less community support)

## Alternatives Considered
- Redux: Too much boilerplate
- Context API: Performance issues at scale
- Jotai: Too new, less documentation

## References
- Zustand docs: https://zustand-demo.pmnd.rs/
- Discussion: #123
```

### ADR Guidelines

1. **Number Sequentially**: ADR-001, ADR-002, etc.
2. **Update Status**: Proposed → Accepted/Rejected
3. **Explain Context**: Why was decision needed?
4. **Document Trade-offs**: Pros and cons
5. **Link to Discussions**: GitHub issues, PRs, docs

---

## Knowledge Transfer

### Onboarding Checklist

**For New Developers**:

1. **Setup**
   - [ ] Read README.md
   - [ ] Complete local setup
   - [ ] Verify environment works
   - [ ] Read dev-loop-guide.md

2. **Architecture**
   - [ ] Read architecture overview
   - [ ] Understand feature-sliced structure
   - [ ] Review database schema
   - [ ] Understand state management

3. **Codebase**
   - [ ] Explore feature directories
   - [ ] Review existing patterns
   - [ ] Understand component structure
   - [ ] Review API patterns

4. **Process**
   - [ ] Understand git workflow
   - [ ] Review PR process
   - [ ] Understand testing approach
   - [ ] Review deployment process

5. **First Contribution**
   - [ ] Pick small task
   - [ ] Ask questions
   - [ ] Get code review
   - [ ] Learn from feedback

### Handoff Process

**When Leaving Project**:

1. **Document Knowledge**
   - Write handoff document
   - Document complex systems
   - List key contacts
   - Note important decisions

2. **Transfer Responsibilities**
   - Assign new owners
   - Share access credentials
   - Update documentation
   - Schedule handoff meeting

3. **Archive Context**
   - Save important discussions
   - Document tribal knowledge
   - Create runbooks
   - Update TODO.txt

### Knowledge Sharing

**Regular Activities**:
- Weekly team syncs
- Architecture reviews
- Code review discussions
- Documentation updates
- Retrospectives

**Documentation**:
- Meeting notes in docs
- Decisions in ADRs
- Learnings in docs
- Patterns in .cursor/rules

---

## Best Practices

### Documentation

1. **Write for Future You**: Assume no memory of current context
2. **Keep It Updated**: Outdated docs are worse than no docs
3. **Make It Discoverable**: Use clear file names and structure
4. **Link Everything**: Cross-reference related docs
5. **Review Regularly**: Monthly doc review

### Code

1. **Self-Documenting Code**: Write clear code, comment why
2. **Meaningful Names**: Variables/functions explain purpose
3. **Small Functions**: Easier to understand and document
4. **Consistent Patterns**: Follow established patterns
5. **Remove Dead Code**: Don't leave commented code

### Communication

1. **Document Decisions**: Write down important decisions
2. **Share Context**: Don't assume others know
3. **Ask Questions**: Better to ask than guess
4. **Update Docs**: When you learn something, document it
5. **Review Together**: Code review is knowledge sharing

---

## Tools and Resources

### Documentation Tools

- **Markdown**: All docs in Markdown
- **Mermaid**: Diagrams in docs (future)
- **JSDoc**: Code documentation
- **Storybook**: Component docs (future)

### Knowledge Management

- **GitHub Issues**: Track decisions and discussions
- **GitHub Discussions**: Long-form discussions
- **Slack/Discord**: Quick questions and updates
- **Wiki**: Project wiki (if using GitHub)

### Search and Discovery

- **GitHub Search**: Search code and issues
- **VS Code Search**: Search codebase
- **Documentation Index**: `docs/README.md`
- **TODO.txt**: Project status and priorities

---

**End of Context Preservation Guide**

