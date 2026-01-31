# Vendia POS Ecosystem

This project consists of a Backend API and a Monorepo Frontend (Web + Mobile).

## Structure

- **vendia-api**: Laravel Backend API
- **vendia-app**: Frontend Monorepo
  - **apps/web**: React + Vite Web Application
  - **apps/mobile**: React Native + Expo Mobile Application
  - **packages/shared**: Shared logic (Zustand, React Query, Axios)

## Setup

### Backend (vendia-api)
1. Navigate to `vendia-api`.
2. Run `composer install` (if not already installed).
3. Copy `.env.example` to `.env` and configure database.
4. Run `php artisan migrate`.
5. Run `php artisan serve` to start the API.

### Frontend (vendia-app)
1. Navigate to `vendia-app`.
2. Run `pnpm install` (requires Node.js and pnpm).
3. To start web: `pnpm --filter web dev`
4. To start mobile: `pnpm --filter mobile start`

## Prerequisites
- PHP 8.2+
- Composer
- Node.js & pnpm
