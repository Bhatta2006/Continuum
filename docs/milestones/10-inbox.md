# Milestone 10: Web App - Proposal Inbox & Conflict Resolution

## Goal
Build the UI for managing incoming AI memory proposals. This inbox serves as the human-in-the-loop review station for accepting or rejecting newly extracted knowledge, and resolving detected conflicts (supersessions).

## Deliverables
- `app/projects/[projectId]/inbox/page.tsx` displaying pending memory proposals.
- UI components for "Approve", "Reject", and "Merge" (for conflicts).
- Interactive cards showing the proposed memory content and confidence score.

## Test Criteria
- Playwright E2E test verifying the inbox renders with pending proposals and interactive buttons.
