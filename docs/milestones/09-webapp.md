# Milestone 9: Web App - Auth, Workspaces & Memory Explorer

## Goal
Build the initial Next.js (App Router) application. Integrate `shadcn/ui` for rapid, accessible component development. Implement the foundational UI screens: user login, project selection, and the Memory Explorer.

## Deliverables
- `apps/web` initialized with Next.js App Router and `shadcn/ui`.
- `app/login/page.tsx` for authentication.
- `app/projects/page.tsx` for workspace and project selection.
- `app/projects/[projectId]/memory/page.tsx` for the Memory Explorer.

## Test Criteria
- Playwright E2E test validating navigation from login to project selection, and rendering the memory explorer search interface.
