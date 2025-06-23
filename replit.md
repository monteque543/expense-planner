# Expense Management Application

## Overview
A modern expense management application that transforms financial tracking into an engaging, user-friendly experience through innovative design and interactive technologies. The application provides comprehensive financial monitoring tools with advanced transaction management, focusing on robust recurring transaction handling, budget protection, and intelligent financial insights.

## Recent Changes
**June 23, 2025:**
- ✓ Disabled budget protection system completely to allow expense addition in all months
- ✓ Enhanced skip transaction functionality with improved cache invalidation
- ✓ Added comprehensive budget calculation utilities for consistent skip handling
- ✓ Implemented real-time budget updates for recurring transaction modifications
- → Working on: Skip functionality should update budget calculations when transactions are skipped
- → Working on: Recurring transaction updates should refresh current month and upcoming budget calculations

## Tech Stack
- React.js frontend with TypeScript
- PostgreSQL database with Drizzle ORM
- Recharts for data visualization
- Zod for validation
- React Hook Form for form management
- TanStack React Query for state management
- Responsive design for mobile and desktop
- Theme customization support

## Project Architecture
### Frontend (`client/`)
- **Components**: Modular UI components including calendar view, transaction modals, budget summaries
- **Utils**: Centralized utilities for budget calculations, skip handling, currency conversion
- **Pages**: Main application pages (ExpensePlanner is primary interface)

### Backend (`server/`)
- **Routes**: RESTful API endpoints for transactions, categories, savings
- **Storage**: Database abstraction layer with both in-memory and PostgreSQL implementations
- **Auth**: Session-based authentication with Passport.js

### Key Features
1. **Transaction Management**: Support for one-time and recurring transactions
2. **Skip Functionality**: Ability to skip recurring transactions for specific months
3. **Budget Protection**: Configurable expense blocking when budget is negative (currently disabled)
4. **Multi-currency Support**: USD/EUR with automatic PLN conversion
5. **Person Labels**: Support for "Beni", "Fabi", "Michał", "Together"
6. **Income Categories**: Special labels "techs", "omega"

## Current Issues
1. **Skip Transactions**: When users skip a recurring transaction, budget calculations don't update properly
2. **Recurring Updates**: Editing recurring transactions should update current month and all future occurrences

## User Preferences
- Budget protection should be completely disabled
- All expense additions should be allowed regardless of balance
- Skip functionality must properly exclude transactions from budget calculations
- Real-time updates needed for recurring transaction modifications

## Development Notes
- Uses centralized budget calculation utilities in `client/src/utils/budgetCalculations.ts`
- Skip functionality implemented via localStorage with month-specific keys
- Transaction cache invalidation required for proper budget updates
- Comprehensive logging for debugging financial calculations