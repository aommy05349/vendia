# Vendia POS Ecosystem

A comprehensive Point of Sale (POS) and Business Management System designed for retail and service-based businesses. This project implements a modern monorepo architecture combining a robust Laravel backend with a reactive React frontend (Web + Mobile).

## 🏗 Architecture

The project is structured as a monorepo:

- **`vendia-api`**: Laravel 11 Backend API handling data persistence, authentication, and business logic.
- **`vendia-app`**: Frontend workspace using pnpm.
  - **`apps/web`**: React + Vite + Bootstrap 5 web application for admin dashboard and POS terminal.
  - **`apps/mobile`**: React Native + Expo mobile application for technicians and field staff.
  - **`packages/shared`**: Shared TypeScript logic, including Zustand stores, Axios configuration, and types.

## 🚀 Key Features

### 🛒 Point of Sale (POS)
- **Product & Service Sales**: Unified cart for physical products and services.
- **Customer Management**: Quick customer lookup and creation during checkout.
- **Discounts & Deductions**: Support for negative price items (deductions) and custom pricing.
- **Multiple Payment Methods**: Cash, transfer, and other payment tracking.

### 📄 Order Management
- **Document Workflow**: Full lifecycle support for Quotations, Billing Notes, and Receipts.
- **History Tracking**: Maintain history of all document versions per order.
- **Print Layouts**: Specialized print views for thermal printers and A4 invoices.

### 📦 Inventory & Products
- **Product Management**: Categories, Brands, Units, and Warehouses.
- **Bundles & Sets**: Support for product bundles and service packages.
- **Stock Tracking**: Multi-warehouse inventory management.

### 🔧 Service & Appointments
- **Appointment Scheduling**: Calendar and List views for job assignments.
- **Technician Dashboard**: Mobile-optimized view for technicians to view assigned jobs.
- **Map Integration**: Leaflet-based map view for appointment locations.
- **Job Status**: Track job progress from assignment to completion.

### 👥 HR & Attendance
- **Time Tracking**: Check-in/Check-out system for employees.
- **Live Monitor**: Real-time dashboard to track active staff.
- **Timesheets**: Monthly attendance reports with status (On-time, Late, Absent, Weekly Off).
- **Payroll Support**: Data structure supports payroll calculation based on attendance.

## 🛠 Tech Stack

### Backend
- **Framework**: Laravel 11
- **Database**: MySQL / SQLite
- **Auth**: Laravel Sanctum
- **API**: RESTful API with Resource Controllers

### Frontend (Web)
- **Framework**: React 18 (Vite)
- **State Management**: Zustand
- **UI Library**: Bootstrap 5 (React Bootstrap)
- **Maps**: React Leaflet
- **Localization**: i18n (Thai/English)

## ⚡ Getting Started

### Prerequisites
- PHP 8.2+
- Composer
- Node.js (v18+) & pnpm

### 1. Backend Setup (`vendia-api`)

```bash
cd vendia-api

# Install PHP dependencies
composer install

# Configure environment
cp .env.example .env
# Edit .env to set your database credentials (DB_DATABASE, DB_USERNAME, etc.)

# Generate App Key
php artisan key:generate

# Run Migrations and Seed Database (Crucial for initial data)
php artisan migrate --seed

# Start the API server
php artisan serve
```

> **Note**: The seeder populates the database with essential data (Thai categories, units, services) and dummy data for testing.

### 2. Frontend Setup (`vendia-app`)

```bash
cd vendia-app

# Install dependencies
pnpm install

# Start the Web Application
pnpm --filter web dev
# Access at http://localhost:5173

# Start the Mobile Application (Optional)
pnpm --filter mobile start
```

## 📂 Project Structure

```
vendia/
├── vendia-api/          # Laravel Backend
│   ├── app/
│   ├── database/
│   └── routes/
├── vendia-app/          # Frontend Monorepo
│   ├── apps/
│   │   ├── web/         # Admin & POS Web App
│   │   └── mobile/      # Technician Mobile App
│   └── packages/
│       └── shared/      # Shared logic & types
└── README.md            # This file
```

## 🌍 Localization

The system is fully localized for **Thai (TH)** and **English (EN)**, with specific optimizations for Thai business contexts (e.g., address formats, currency display, date formatting).
