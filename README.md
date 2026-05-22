# model-jira

Lightweight internal Jira-style project management system.

## Stack
- **Frontend:** React 18 + Vite + TypeScript + TailwindCSS + dnd-kit
- **Backend:** Node.js + Express + TypeScript + Zod + JWT
- **Database:** MSSQL (mssql / tedious)
- **Storage:** Azure Blob Storage

## Getting Started

```bash
# Install all dependencies
npm run install:all

# Copy env and fill in values
cp .env.example server/.env

# Start dev servers (client :5173, server :3001)
npm run dev
```

## Modules
1. Auth (login/register)
2. Users
3. Projects
4. Statuses
5. Epics
6. Tickets (Task/Bug/Story) + Kanban
7. Comments
8. Attachments (Azure Blob)
9. Work Logs
10. Activity History
