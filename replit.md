# BlockMonitor.py

## Overview

BlockMonitor.py is a real-time blockchain transaction monitoring dashboard. It combines a Python-based blockchain monitoring script with a React frontend to display live transaction logs, threat detection alerts, and system telemetry. The application monitors Ethereum mainnet transactions for suspicious activity including gas anomalies, rapid transactions, honeypot patterns, and known attacker addresses.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight alternative to React Router)
- **State Management**: TanStack React Query for server state with auto-refresh every 2 seconds
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style)
- **Animations**: Framer Motion for log entry animations and transitions
- **Build Tool**: Vite with path aliases (@/, @shared/, @assets/)

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript (ESM modules)
- **Process Management**: Python child process spawned from Express for blockchain monitoring
- **API Design**: Simple REST endpoints defined in shared/routes.ts with Zod validation

### Data Flow
1. Python monitor script (`server/monitor.py`) connects to Ethereum via Web3 and outputs JSON logs to stdout
2. Express server captures stdout, parses JSON, and persists logs to PostgreSQL
3. Frontend polls `/api/logs` every 2 seconds for real-time updates
4. Logs display with level-based styling (INFO/WARN/ERROR)

### Database Schema
- Single table `monitoring_logs` with fields: id, level, message, data (JSONB), createdAt
- Uses Drizzle ORM with PostgreSQL dialect
- Schema defined in `shared/schema.ts` with Zod validation via drizzle-zod

### Key Design Decisions
- **Shared Types**: Schema and route definitions in `shared/` directory for type safety across frontend/backend
- **Python for Monitoring**: Web3.py provides robust async blockchain connectivity; output streams to Node via stdout
- **Dark Theme**: Optimized for monitoring dashboards with status-specific colors (blue/amber/red)
- **Component Architecture**: Reusable shadcn/ui components with custom StatusCard and LogEntry components

## External Dependencies

### Database
- **PostgreSQL**: Primary data store accessed via `DATABASE_URL` environment variable
- **Drizzle ORM**: Type-safe database operations with migration support via `drizzle-kit push`

### Blockchain
- **Web3.py**: Python library for Ethereum RPC connections (async HTTP provider)
- **Ethereum Mainnet**: Default network for transaction monitoring

### Python Packages (auto-installed by monitor script)
- web3: Ethereum interaction
- numpy: Statistical analysis for anomaly detection
- requests/httpx/aiohttp: HTTP clients for RPC and external APIs

### Frontend Libraries
- @tanstack/react-query: Data fetching and caching
- framer-motion: Animation library
- lucide-react: Icon library
- date-fns: Date formatting
- Radix UI primitives: Accessible component foundations