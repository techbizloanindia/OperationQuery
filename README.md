# OpsQuery - Real-time Query Management System

![OpsQuery](https://img.shields.io/badge/OpsQuery-v2.0-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-15.3.5-black.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.0-38B2AC.svg)
![MongoDB](https://img.shields.io/badge/MongoDB-6.17-green.svg)
![React](https://img.shields.io/badge/React-19.0-blue.svg)
![MIT License](https://img.shields.io/badge/License-MIT-green.svg)

**OpsQuery** is an advanced real-time query management system designed for financial institutions to streamline communication and workflow between Operations, Sales, Credit, and Approval teams. The system provides role-based dashboards, real-time messaging, query tracking, multi-stage approval workflows, comprehensive audit trails, and advanced analytics.

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/your-org/opsquery.git
cd opsquery

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your MongoDB connection string

# Start development server
npm run dev

# Access at http://localhost:3000
```

## 🎯 Core Value Proposition

- **🚀 Real-Time Collaboration**: Instant messaging and live updates across all teams
- **🔄 Advanced Workflow Management**: Multi-stage approval process with complete audit trails
- **🔒 Role-Based Security**: Query creation restricted to Operations team only
- **📊 Comprehensive Analytics**: Real-time dashboards and reporting for all stakeholders
- **🛡️ Enterprise Security**: Role-based access control with team-specific permissions
- **⚡ High Performance**: Built with Next.js 15, React 19, and optimized for scale
- **🔧 Modern Architecture**: Microservices design with MongoDB and real-time updates

## 🔐 Authentication & Security

### Role-Based Access Control

| Role | Query Creation | Dashboard Access | Special Permissions |
|------|:--------------:|:----------------:|:------------------:|
| **Operations** | ✅ **ALLOWED** | Full Operations Dashboard | Create queries, manage workflow |
| **Sales** | ❌ **DENIED** | Sales Dashboard only | View & respond to queries |
| **Credit** | ❌ **DENIED** | Credit Dashboard only | View & respond to queries |
| **Admin** | ❌ **DENIED** | Admin Dashboard | User management, system config |
| **Approval** | ❌ **DENIED** | Approval Dashboard | Approve/reject decisions |

### Security Features

- **API-Level Protection**: Query creation endpoint (`/api/queries POST`) validates user role
- **Frontend Restrictions**: AddQuery component only accessible from Operations dashboard
- **Header Authentication**: User role sent in `x-user-role` header for validation
- **403 Forbidden Response**: Non-operations users receive permission denied errors

## 📁 Complete Project Structure

```
opsquery/
├── 📁 src/
│   ├── 📁 app/                           # Next.js 15 App Router
│   │   ├── 📁 admin-dashboard/           # Admin Interface Module
│   │   │   └── page.tsx                  # Admin Dashboard Page
│   │   ├── 📁 approval-dashboard/        # Approval Team Interface
│   │   │   ├── page.tsx                  # Main Approval Dashboard
│   │   │   ├── 📁 approval-history/      # Approval History Module
│   │   │   ├── 📁 my-approvals/          # Personal Approvals Module
│   │   │   ├── 📁 pending-approvals/     # Pending Approvals Module
│   │   │   ├── 📁 reports/               # Approval Reports Module
│   │   │   ├── 📁 settings/              # Approval Settings Module
│   │   │   ├── 📁 urgent-approvals/      # Urgent Approvals Module
│   │   │   └── 📁 workflow-management/   # Workflow Management Module
│   │   │
│   │   ├── 📁 api/                       # Backend API Routes
│   │   │   ├── 📁 access-rights/         # User Access Control API
│   │   │   │   └── route.ts
│   │   │   ├── 📁 applications/          # Application Management API
│   │   │   │   ├── 📁 [appNo]/           # Dynamic App Number Routes
│   │   │   │   │   ├── 📁 queries/       # App-specific Query API
│   │   │   │   │   │   └── route.ts
│   │   │   │   │   └── route.ts          # Single App API
│   │   │   │   ├── 📁 debug/             # Debug API Endpoints
│   │   │   │   ├── 📁 seed/              # Sample Data Seeding
│   │   │   │   ├── 📁 stats/             # Application Statistics
│   │   │   │   └── route.ts              # Main Applications API
│   │   │   ├── 📁 approvals/             # Approval Management API
│   │   │   │   └── route.ts              # Approval requests and processing
│   │   │   ├── 📁 auth/                  # Authentication API
│   │   │   │   └── 📁 login/
│   │   │   │       └── route.ts
│   │   │   ├── 📁 branches/              # Branch Management API
│   │   │   │   ├── 📁 [id]/              # Dynamic Branch Routes
│   │   │   │   ├── 📁 bulk-create/       # Bulk Branch Creation
│   │   │   │   ├── 📁 bulk-update/       # Bulk Branch Updates
│   │   │   │   ├── 📁 seed-production/   # Production Data Seeding
│   │   │   │   └── route.ts              # Main Branches API
│   │   │   ├── 📁 bulk-upload/           # File Upload API
│   │   │   │   └── route.ts
│   │   │   ├── 📁 bulk-upload-json/      # JSON Bulk Upload API
│   │   │   │   └── route.ts
│   │   │   ├── 📁 health/                # Health Check API
│   │   │   │   └── route.ts
│   │   │   ├── 📁 queries/               # 🔒 PROTECTED Query Management API
│   │   │   │   ├── 📁 [queryId]/         # Dynamic Query Routes
│   │   │   │   │   ├── 📁 chat/          # Query Chat API
│   │   │   │   │   │   ├── 📁 events/    # Chat Events API
│   │   │   │   │   │   │   └── route.ts
│   │   │   │   │   │   └── route.ts      # Chat Messages API
│   │   │   │   │   ├── 📁 remarks/       # Query Remarks API
│   │   │   │   │   │   └── route.ts
│   │   │   │   │   └── route.ts          # Single Query API
│   │   │   │   ├── 📁 analytics/         # Query Analytics API
│   │   │   │   │   └── route.ts
│   │   │   │   ├── 📁 credit/            # Credit Team Queries API
│   │   │   │   │   └── route.ts
│   │   │   │   ├── 📁 events/            # Query Events API
│   │   │   │   │   └── route.ts
│   │   │   │   ├── 📁 risk-assessments/  # Risk Assessment API
│   │   │   │   │   └── route.ts
│   │   │   │   ├── 📁 sales/             # Sales Team Queries API
│   │   │   │   │   └── route.ts
│   │   │   │   ├── 📁 updates/           # Query Updates API
│   │   │   │   │   └── route.ts
│   │   │   │   └── route.ts              # 🔒 Main Queries API (Operations Only)
│   │   │   ├── 📁 query-actions/         # Query Actions & Approval Workflow API
│   │   │   │   └── route.ts              # Actions, approvals, messaging
│   │   │   ├── 📁 query-responses/       # Query Response Management
│   │   │   │   └── route.ts
│   │   │   ├── 📁 reports/               # Reporting API
│   │   │   │   ├── 📁 generate/          # Report Generation API
│   │   │   │   │   └── route.ts
│   │   │   │   └── route.ts              # Main Reports API
│   │   │   ├── 📁 sanctioned-applications/ # Sanctioned Applications API
│   │   │   │   ├── 📁 [appId]/           # Dynamic Sanctioned App Routes
│   │   │   │   │   └── route.ts
│   │   │   │   ├── 📁 bulk/              # Bulk Sanctioned Operations
│   │   │   │   │   └── route.ts
│   │   │   │   ├── 📁 expiring/          # Expiring Applications API
│   │   │   │   │   └── route.ts
│   │   │   │   ├── 📁 stats/             # Sanctioned Statistics API
│   │   │   │   │   └── route.ts
│   │   │   │   └── route.ts              # Main Sanctioned Apps API
│   │   │   ├── 📁 settings/              # System Settings API
│   │   │   │   └── route.ts
│   │   │   ├── 📁 users/                 # User Management API
│   │   │   │   ├── 📁 [id]/              # Dynamic User Routes
│   │   │   │   │   └── route.ts
│   │   │   │   ├── 📁 check-role/        # Role Verification API
│   │   │   │   │   └── route.ts
│   │   │   │   └── route.ts              # Main Users API
│   │   │   └── 📁 workflows/             # Workflow Management API
│   │   │       └── route.ts              # Workflow configuration and tracking
│   │   │
│   │   ├── 📁 control-panel/             # Control Panel Module
│   │   │   └── page.tsx
│   │   ├── 📁 credit-dashboard/          # Credit Team Interface
│   │   │   └── page.tsx
│   │   ├── 📁 login/                     # Authentication Module
│   │   │   └── page.tsx
│   │   ├── 📁 operations/                # Operations Team Interface
│   │   │   ├── operations.css            # Operations-specific styles
│   │   │   └── page.tsx
│   │   ├── 📁 query-details/             # Query Details Module
│   │   │   └── 📁 [appNo]/
│   │   │       └── page.tsx
│   │   ├── 📁 query-reply/               # Query Reply Interface
│   │   │   └── 📁 [appNo]/
│   │   ├── 📁 query-resolve/             # Query Resolution Module
│   │   │   └── 📁 [appNo]/
│   │   │       └── page.tsx
│   │   ├── 📁 sales/                     # Sales Team Interface
│   │   │   └── page.tsx
│   │   ├── 📁 sales-dashboard/           # Sales Dashboard Module
│   │   │   └── page.tsx
│   │   ├── favicon.ico                   # App Favicon
│   │   ├── globals.css                   # Global Styles
│   │   ├── layout.tsx                    # Root Layout
│   │   └── page.tsx                      # Homepage
│   │
│   ├── 📁 components/                    # React Components Library
│   │   ├── 📁 admin/                     # Admin Components
│   │   │   ├── AdminDashboard.tsx        # Main Admin Dashboard
│   │   │   ├── AdminNavbar.tsx           # Admin Navigation
│   │   │   ├── BranchManagementTab.tsx   # Branch Management Interface
│   │   │   ├── BulkUploadTab.tsx         # Bulk Upload Interface
│   │   │   └── UserCreationTab.tsx       # User Management Interface
│   │   │
│   │   ├── 📁 approval/                  # Approval Team Components
│   │   │   ├── ApprovalDashboard.tsx     # Main Approval Dashboard
│   │   │   ├── ApprovalHistory.tsx       # Approval History View
│   │   │   ├── ApprovalReports.tsx       # Approval Reports & Analytics
│   │   │   ├── ApprovalSettings.tsx      # Approval Settings
│   │   │   ├── ApprovalSidebar.tsx       # Approval Navigation Sidebar
│   │   │   ├── MyApprovals.tsx           # Personal Approvals Management
│   │   │   ├── PendingApprovals.tsx      # Pending Approvals Interface
│   │   │   ├── UrgentApprovals.tsx       # Urgent Approvals Management
│   │   │   └── WorkflowManagement.tsx    # Workflow Management Interface
│   │   │
│   │   ├── 📁 auth/                      # Authentication Components
│   │   │   ├── ControlPanelLogin.tsx     # Control Panel Login
│   │   │   ├── Login.tsx                 # Main Login Component
│   │   │   └── ProtectedRoute.tsx        # Route Protection Component
│   │   │
│   │   ├── 📁 credit/                    # Credit Team Components
│   │   │   ├── CreditAnalytics.tsx       # Credit Analytics Dashboard
│   │   │   ├── CreditDashboard.tsx       # Main Credit Dashboard
│   │   │   ├── CreditDashboardOverview.tsx # Credit Overview Dashboard
│   │   │   ├── CreditNavbar.tsx          # Credit Navigation
│   │   │   ├── CreditQueriesRaised.tsx   # Credit Queries Raised
│   │   │   ├── CreditQueriesRaisedEnhanced.tsx # Enhanced Credit Queries View
│   │   │   ├── CreditQueriesResolved.tsx # Credit Queries Resolved
│   │   │   ├── CreditQueryManagement.tsx # Credit Query Management
│   │   │   ├── CreditReports.tsx         # Credit Reports
│   │   │   ├── CreditRiskAssessment.tsx  # Credit Risk Assessment
│   │   │   ├── CreditSettings.tsx        # Credit Settings
│   │   │   └── CreditSidebar.tsx         # Credit Sidebar Navigation
│   │   │
│   │   ├── 📁 csv/                       # CSV Components
│   │   │   └── CsvUploader.tsx           # CSV File Upload Component
│   │   │
│   │   ├── 📁 diagnostic/                # Diagnostic Components
│   │   │   └── CSVDiagnostic.tsx         # CSV Diagnostic Tool
│   │   │
│   │   ├── 📁 operations/                # Operations Team Components
│   │   │   ├── AddQuery.tsx              # 🔒 Query Creation Form (Operations Only)
│   │   │   ├── AddQueryClean.tsx         # Clean Query Creation Interface
│   │   │   ├── CaseAccordion.tsx         # Case Management View
│   │   │   ├── DashboardOverview.tsx     # Operations Dashboard Overview
│   │   │   ├── EmptyState.tsx            # Empty State Component
│   │   │   ├── ErrorState.tsx            # Error State Component
│   │   │   ├── LoadingState.tsx          # Loading State Component
│   │   │   ├── OperationsDashboard.tsx   # Main Operations Dashboard
│   │   │   ├── OperationsHeader.tsx      # Operations Header
│   │   │   ├── OperationsNavbar.tsx      # Operations Navigation
│   │   │   ├── OperationsQueryProvider.tsx # Operations Query Data Provider
│   │   │   ├── OperationsSidebar.tsx     # Operations Sidebar Navigation
│   │   │   ├── QueryItem.tsx             # Query Item Component
│   │   │   ├── QueryRaised.tsx           # Enhanced Raised Queries with Approval Flow
│   │   │   ├── QueryReports.tsx          # Operations Query Reports
│   │   │   ├── QueryResolved.tsx         # Resolved Queries View
│   │   │   ├── SanctionedCases.tsx       # Sanctioned Cases View
│   │   │   ├── TabNavigation.tsx         # Tab Navigation Component
│   │   │   ├── WaitingApproval.tsx       # Waiting for Approval Component
│   │   │   └── utils.ts                  # Utility Functions
│   │   │
│   │   ├── 📁 sales/                     # Sales Team Components
│   │   │   ├── SalesDashboard.tsx        # Main Sales Dashboard
│   │   │   ├── SalesDashboardOverview.tsx # Sales Dashboard Overview
│   │   │   ├── SalesNavbar.tsx           # Sales Navigation
│   │   │   ├── SalesQueriesRaised.tsx    # Sales Queries Raised (View Only)
│   │   │   ├── SalesQueriesResolved.tsx  # Sales Queries Resolved
│   │   │   ├── SalesReports.tsx          # Sales Reports
│   │   │   ├── SalesSettings.tsx         # Sales Settings
│   │   │   └── SalesSidebar.tsx          # Sales Sidebar Navigation
│   │   │
│   │   └── 📁 shared/                    # Shared/Common Components
│   │       ├── ChatDemo.tsx              # Chat Demo Component
│   │       ├── ConnectionStatus.tsx      # Connection Status Indicator
│   │       ├── ModernChatInterface.tsx   # Modern Chat Interface
│   │       ├── ModernRemarksInterface.tsx # Modern Remarks Interface
│   │       ├── QueriesByAppNo.tsx        # Queries by Application Number
│   │       ├── QueryChatModal.tsx        # Chat Modal Component
│   │       ├── QueryHistoryModal.tsx     # Query History Modal
│   │       ├── QueryReplyModal.tsx       # Reply Modal Component
│   │       ├── RealTimeChatModal.tsx     # Real-time Chat Modal
│   │       ├── RemarkChatInterface.tsx   # Remark Chat Interface
│   │       ├── RemarksComponent.tsx      # Remarks Component
│   │       ├── ResolvedQueriesTable.tsx  # Resolved Queries Table
│   │       ├── RevertMessageBox.tsx      # Revert Message Display
│   │       ├── StatusUtils.tsx           # Status Utility Components
│   │       ├── TeamCollaborationWidget.tsx # Team Collaboration Widget
│   │       └── shared.css                # Shared Styles
│   │
│   ├── 📁 contexts/                      # React Context Providers
│   │   ├── AuthContext.tsx               # Authentication Context
│   │   ├── BranchContext.tsx             # Branch Data Context
│   │   └── QueryClientProvider.tsx       # TanStack Query Provider
│   │
│   ├── 📁 lib/                          # Utility Libraries & Services
│   │   ├── 📁 models/                    # Data Models
│   │   │   ├── Application.ts            # Application Data Model
│   │   │   ├── Branch.ts                 # Branch Data Model
│   │   │   ├── Chat.ts                   # Chat Message Model
│   │   │   ├── Query.ts                  # Query Data Model
│   │   │   ├── Remarks.ts                # Remarks Model
│   │   │   └── User.ts                   # User Data Model
│   │   ├── dashboardSyncUtils.ts         # Dashboard Sync Utilities
│   │   ├── eventStreamUtils.ts           # Event Stream Utilities
│   │   ├── mongodb.ts                    # MongoDB Connection
│   │   ├── querySyncService.ts           # Query Sync Service
│   │   ├── queryUpdateLogger.ts          # Query Update Logger
│   │   └── queryUpdateService.ts         # Query Update Service
│   │
│   └── 📁 types/                        # TypeScript Definitions
│       └── shared.ts                     # Shared Type Definitions
│
├── 📁 public/                           # Static Assets
│   ├── icon.png                         # App Icon
│   ├── logo.png                         # App Logo
│   ├── manifest.json                    # PWA Manifest
│   ├── next.svg                         # Next.js Logo
│   ├── sample-applications.csv          # Sample Data
│   ├── vercel.svg                       # Vercel Logo
│   └── window.svg                       # Window Icon
│
├── eslint.config.mjs                    # ESLint Configuration
├── next.config.ts                       # Next.js Configuration
├── package-lock.json                    # Package Lock File
├── package.json                         # Package Dependencies
├── postcss.config.mjs                   # PostCSS Configuration
├── README.md                            # Project Documentation
└── tsconfig.json                        # TypeScript Configuration
```

## 🏗️ System Architecture & Component Hierarchy

### Module Overview & Dependencies

```mermaid
graph TB
    subgraph "OpsQuery System Architecture"
        
        subgraph "Frontend Modules"
            A1[🔒 Operations Dashboard<br/>Query Creation ONLY]
            A2[👁️ Sales Dashboard<br/>View & Respond Only]
            A3[👁️ Credit Dashboard<br/>View & Respond Only]
            A4[⚙️ Admin Dashboard<br/>User Management]
            A5[✅ Approval Dashboard<br/>Decision Making]
        end
        
        subgraph "API Security Layer"
            B1[🔐 Authentication API<br/>Role Validation]
            B2[📂 Applications API<br/>Application Data]
            B3[🔒 Queries API<br/>OPERATIONS ONLY POST]
            B4[💬 Query Actions API<br/>Messages & Workflow]
            B5[👥 Users API<br/>User Management]
            B6[🏢 Branches API<br/>Branch Management]
            B7[✅ Approvals API<br/>Approval Workflow]
        end
        
        subgraph "Data Models"
            C1[User Model<br/>Roles & Permissions]
            C2[Application Model<br/>Loan Data]
            C3[Query Model<br/>Query Lifecycle]
            C4[Branch Model<br/>Branch Info]
            C5[Chat Model<br/>Messages]
            C6[Approval Model<br/>Decisions]
        end
        
        subgraph "External Services"
            D1[MongoDB Database<br/>Primary Storage]
            D2[Authentication Service<br/>Role Management]
            D3[Real-time Updates<br/>Live Sync]
        end
        
        A1 --> |CREATE QUERIES| B3
        A1 --> B2
        A1 --> B4
        A2 --> |VIEW ONLY| B2
        A2 --> |VIEW/RESPOND| B3
        A2 --> B4
        A3 --> |VIEW ONLY| B2
        A3 --> |VIEW/RESPOND| B3
        A3 --> B4
        A4 --> B5
        A4 --> B6
        A5 --> B7
        A5 --> B4
        
        B1 --> C1
        B2 --> C2
        B3 --> |ROLE CHECK| C1
        B3 --> C3
        B4 --> C3
        B4 --> C5
        B5 --> C1
        B6 --> C4
        B7 --> C6
        
        C1 --> D1
        C2 --> D1
        C3 --> D1
        C4 --> D1
        C5 --> D1
        C6 --> D1
        
        B1 --> D2
        B3 --> |403 if not Operations| D2
        B4 --> D3
    end
```

### Component Hierarchy & Relationships

```
App (Root Layout)
├── 🔐 Authentication Layer
│   ├── Login Component
│   ├── ProtectedRoute Component
│   └── ControlPanelLogin Component
│
├── 📊 Dashboard Modules
│   ├── 🔒 Operations Dashboard (Query Creation Allowed)
│   │   ├── OperationsNavbar
│   │   ├── OperationsSidebar
│   │   │   ├── Dashboard Overview Tab
│   │   │   ├── Queries Raised Tab
│   │   │   ├── Sanctioned Cases Tab
│   │   │   ├── ⭐ Add Query Tab (EXCLUSIVE)
│   │   │   ├── Queries Resolved Tab
│   │   │   └── Reports Tab
│   │   ├── DashboardOverview
│   │   ├── QueryRaised (with Approval Workflow)
│   │   ├── QueryResolved
│   │   ├── SanctionedCases
│   │   ├── 🔒 AddQuery (Operations Only)
│   │   ├── QueryReports
│   │   └── WaitingApproval
│   │
│   ├── 👁️ Sales Dashboard (Query Viewing Only)
│   │   ├── SalesNavbar
│   │   ├── SalesSidebar
│   │   │   ├── Dashboard Tab
│   │   │   ├── Queries Raised Tab (View Only)
│   │   │   └── Queries Resolved Tab
│   │   ├── SalesDashboardOverview
│   │   ├── SalesQueriesRaised (View & Respond)
│   │   ├── SalesQueriesResolved
│   │   ├── SalesReports
│   │   └── SalesSettings
│   │
│   ├── 👁️ Credit Dashboard (Query Viewing Only)
│   │   ├── CreditNavbar
│   │   ├── CreditSidebar
│   │   │   ├── Dashboard Tab
│   │   │   ├── Queries Raised Tab (View Only)
│   │   │   └── Queries Resolved Tab
│   │   ├── CreditDashboardOverview
│   │   ├── CreditQueriesRaised (View & Respond)
│   │   ├── CreditQueriesResolved
│   │   ├── CreditAnalytics
│   │   ├── CreditReports
│   │   ├── CreditRiskAssessment
│   │   ├── CreditQueryManagement
│   │   └── CreditSettings
│   │
│   ├── ✅ Approval Dashboard (Decision Making)
│   │   ├── ApprovalSidebar
│   │   │   ├── Dashboard Tab
│   │   │   ├── Pending Approvals Tab
│   │   │   ├── My Approvals Tab
│   │   │   ├── Urgent Approvals Tab
│   │   │   ├── Approval History Tab
│   │   │   ├── Reports Tab
│   │   │   ├── Settings Tab
│   │   │   └── Workflow Management Tab
│   │   ├── ApprovalDashboard
│   │   ├── PendingApprovals
│   │   ├── MyApprovals
│   │   ├── UrgentApprovals
│   │   ├── ApprovalHistory
│   │   ├── ApprovalReports
│   │   ├── ApprovalSettings
│   │   └── WorkflowManagement
│   │
│   └── ⚙️ Admin Dashboard (System Management)
│       ├── AdminNavbar
│       ├── AdminDashboard
│       ├── UserCreationTab
│       ├── BranchManagementTab
│       └── BulkUploadTab
│
├── 💬 Shared Communication Components
│   ├── ModernChatInterface
│   ├── QueryChatModal
│   ├── QueryReplyModal
│   ├── RealTimeChatModal
│   ├── RemarkChatInterface
│   ├── ModernRemarksInterface
│   ├── RemarksComponent
│   └── ChatDemo
│
├── 📋 Shared Query Components
│   ├── QueriesByAppNo
│   ├── QueryHistoryModal
│   ├── ResolvedQueriesTable
│   ├── RevertMessageBox
│   ├── StatusUtils
│   └── TeamCollaborationWidget
│
├── 🔧 Utility Components
│   ├── ConnectionStatus
│   ├── LoadingState (Operations)
│   ├── ErrorState (Operations)
│   ├── EmptyState (Operations)
│   └── TabNavigation (Operations)
│
├── 📊 CSV & Data Components
│   ├── CsvUploader
│   └── CSVDiagnostic
│
└── 🗂️ Context Providers
    ├── AuthContext (Global Authentication)
    ├── BranchContext (Branch Data)
    └── QueryClientProvider (Data Fetching)
```

## 🔄 Complete Working Workflow

### 1. 🔒 Secure Query Creation Process

```mermaid
sequenceDiagram
    participant USER as User
    participant AUTH as Auth System
    participant OPS as Operations Dashboard
    participant API as Queries API
    participant DB as Database
    participant TEAMS as Other Teams
    
    Note over USER,TEAMS: Query Creation Security Flow
    
    USER->>AUTH: Login with Credentials
    AUTH->>AUTH: Validate User Role
    AUTH->>USER: Return User Object with Role
    
    alt User Role = 'operations'
        USER->>OPS: Access Operations Dashboard
        OPS->>OPS: Show AddQuery Component
        USER->>OPS: Fill Query Form
        OPS->>API: POST /api/queries with x-user-role header
        API->>API: Validate Role = 'operations'
        API->>DB: Create Query Document
        DB->>API: Return Success
        API->>TEAMS: Broadcast Real-time Update
        API->>OPS: Return Success Response
        OPS->>USER: Show Success Message
    else User Role != 'operations'
        USER->>OPS: Try to Access Operations Dashboard
        OPS->>API: POST /api/queries with x-user-role header
        API->>API: Validate Role != 'operations'
        API->>OPS: Return 403 Forbidden
        OPS->>USER: Show "Access Denied" Error
    end
```

### 2. 📋 Enhanced Query Lifecycle with Approval Workflow

```mermaid
graph TD
    subgraph "Complete Query Workflow"
        A[🔒 Query Created<br/>Operations Only] --> B{Team Assignment}
        B -->|Sales| C[📤 Sales Team Notified]
        B -->|Credit| D[📤 Credit Team Notified]
        B -->|Both| E[📤 Both Teams Notified]
        
        C --> F[💬 Sales Team Response]
        D --> G[💬 Credit Team Response]
        E --> H[💬 Multi-team Response]
        
        F --> I{Sales Action}
        G --> J{Credit Action}
        H --> K{Team Actions}
        
        I -->|Direct Response| L[✅ Query Resolved]
        I -->|Revert| M[🔄 Back to Operations]
        
        J -->|Direct Response| L
        J -->|Revert| M
        
        K -->|All Responded| L
        K -->|Revert| M
        
        M --> N[🔍 Operations Review]
        N -->|Approve/OTC/Defer| O[📋 Send for Approval]
        N -->|Modify Query| A
        
        O --> P[✅ Approval Team Review]
        P --> Q{Approval Decision}
        
        Q -->|✅ Approved| L
        Q -->|❌ Rejected| R[📝 Return with Feedback]
        
        R --> N
        
        L --> S[📊 Query Complete<br/>Analytics Updated]
    end
```

### 3. 💬 Real-time Communication Flow

```mermaid
sequenceDiagram
    participant O as Operations
    participant S as Sales
    participant C as Credit
    participant A as Approval Team
    participant API as Query Actions API
    participant DB as Database
    participant WS as WebSocket/SSE
    
    Note over O,WS: Real-time Message Flow
    
    O->>API: Send Message to Query
    API->>DB: Store Message
    API->>WS: Broadcast to All Teams
    WS->>S: Real-time Update
    WS->>C: Real-time Update
    WS->>A: Real-time Update (if involved)
    
    S->>API: Reply to Query
    API->>DB: Store Reply
    API->>WS: Broadcast Reply
    WS->>O: Notify Operations
    WS->>C: Notify Credit
    WS->>A: Notify Approval (if involved)
    
    Note over O,WS: Approval Notification Flow
    
    A->>API: Make Approval Decision
    API->>DB: Update Query & Approval Status
    API->>WS: Broadcast Decision
    WS->>O: Notify Operations (Decision Result)
    WS->>S: Notify Sales (Resolution)
    WS->>C: Notify Credit (Resolution)
    API->>DB: Store Decision Message
    
    Note over O,WS: Revert Action Flow
    
    S->>API: Revert Query to Operations
    API->>DB: Update Query Status to 'pending'
    API->>WS: Broadcast Revert Action
    WS->>O: Notify Operations (Query Reverted)
    WS->>C: Notify Credit (Status Change)
    WS->>A: Notify Approval (Status Change)
    API->>DB: Store Revert Reason
```

### 4. 🔐 Authentication & Authorization Matrix

| Action | Operations | Sales | Credit | Admin | Approval |
|--------|:----------:|:-----:|:------:|:-----:|:--------:|
| **Create Query** | ✅ **ALLOWED** | ❌ **DENIED** | ❌ **DENIED** | ❌ **DENIED** | ❌ **DENIED** |
| **View Assigned Queries** | ✅ All | ✅ Sales/Both | ✅ Credit/Both | ❌ None | ✅ All |
| **Send Messages** | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No | ✅ Yes |
| **Revert Queries** | ❌ No | ✅ Yes | ✅ Yes | ❌ No | ❌ No |
| **Direct Resolution** | ❌ No* | ✅ Yes | ✅ Yes | ❌ No | ❌ No |
| **Request Approval** | ✅ Yes | ❌ No | ❌ No | ❌ No | ❌ No |
| **Approve/Reject** | ❌ No | ❌ No | ❌ No | ❌ No | ✅ **YES** |
| **User Management** | ❌ No | ❌ No | ❌ No | ✅ **YES** | ❌ No |
| **System Settings** | ❌ No | ❌ No | ❌ No | ✅ **YES** | ⚙️ Limited |

*Operations cannot directly resolve - must go through approval workflow

## 🚀 Key Features by Team

### 🔒 Operations Team Dashboard (Query Creation Hub)

#### Core Features
- ✅ **Exclusive Query Creation**: Only Operations team can create new queries
- ✅ **Application Search**: Search sanctioned applications for query creation
- ✅ **Approval Workflow**: Submit Approve/Defer/OTC requests to approval team
- ✅ **Real-time Communication**: Chat with Sales, Credit, and Approval teams
- ✅ **Query Tracking**: Monitor all query stages from creation to resolution
- ✅ **Waiting for Approval**: Track queries pending approval team review

#### Unique Components
- `AddQuery.tsx` - 🔒 **Exclusive query creation form**
- `SanctionedCases.tsx` - Application search and selection
- `WaitingApproval.tsx` - Approval tracking interface
- `QueryRaised.tsx` - Enhanced with approval workflow buttons

### 👁️ Sales Team Dashboard (Query Response Hub)

#### Core Features
- ✅ **Query Viewing**: View all queries assigned to Sales team
- ✅ **Real-time Messaging**: Chat and reply to queries
- ✅ **Revert Functionality**: Send queries back to Operations with feedback
- ✅ **Application Context**: Access customer and loan information
- ✅ **Status Tracking**: Monitor query progress and resolution
- ❌ **No Query Creation**: Cannot create new queries (security restriction)

#### Unique Components
- `SalesDashboard.tsx` - Main sales interface
- `SalesQueriesRaised.tsx` - View and respond to queries
- `SalesDashboardOverview.tsx` - Sales-specific metrics

### 👁️ Credit Team Dashboard (Credit Assessment Hub)

#### Core Features
- ✅ **Credit Query Review**: View and assess credit-related queries
- ✅ **Risk Assessment Tools**: Evaluate credit risks and scoring
- ✅ **Real-time Communication**: Instant messaging with other teams
- ✅ **Case Management**: Organize and prioritize credit cases
- ✅ **Revert Functionality**: Send queries back to Operations
- ❌ **No Query Creation**: Cannot create new queries (security restriction)

#### Unique Components
- `CreditDashboard.tsx` - Main credit interface
- `CreditRiskAssessment.tsx` - Risk evaluation tools
- `CreditAnalytics.tsx` - Credit-specific analytics

### ✅ Approval Team Dashboard (Decision Making Hub)

#### Core Features
- ✅ **Approval Requests**: Review Operations team approval requests
- ✅ **Decision Making**: Approve or reject with detailed comments
- ✅ **Bulk Processing**: Handle multiple approvals efficiently
- ✅ **Approval History**: Track all decisions and outcomes
- ✅ **Urgent Queue**: Prioritize urgent approval requests
- ✅ **Workflow Management**: Configure approval processes

#### Unique Components
- `PendingApprovals.tsx` - Main approval interface
- `ApprovalHistory.tsx` - Decision tracking
- `UrgentApprovals.tsx` - Priority queue management

### ⚙️ Admin Team Dashboard (System Management Hub)

#### Core Features
- ✅ **User Management**: Create, update, and manage user accounts
- ✅ **Role Assignment**: Assign team roles and permissions
- ✅ **Branch Management**: Manage branch information and configurations
- ✅ **Bulk Operations**: Bulk upload and data management
- ✅ **System Configuration**: Configure system-wide settings
- ❌ **No Query Access**: Cannot create or view queries

#### Unique Components
- `UserCreationTab.tsx` - User account management
- `BranchManagementTab.tsx` - Branch configuration
- `BulkUploadTab.tsx` - Data import/export

## 🛠️ Technology Stack & Architecture

### Frontend Stack
- **Next.js 15.3.5** - React framework with App Router
- **React 19** - UI library with advanced hooks
- **TypeScript 5.0** - Type-safe development
- **TailwindCSS 4.0** - Utility-first styling
- **TanStack Query** - Data fetching and caching
- **React Icons** - Comprehensive icon library

### Backend Stack
- **Next.js API Routes** - Server-side API endpoints
- **MongoDB 6.17** - NoSQL database for scalability
- **Role-based Authentication** - Secure access control
- **Real-time Updates** - WebSocket/SSE for live data

### Security Features
- **API Route Protection** - Role validation on sensitive endpoints
- **Request Header Authentication** - User role sent in headers
- **403 Forbidden Responses** - Proper error handling for unauthorized access
- **Component-level Security** - UI restrictions based on user role

### Performance Optimizations
- **Real-time Synchronization** - Live updates across all dashboards
- **Efficient Data Caching** - TanStack Query for optimal performance
- **Component Code Splitting** - Lazy loading for better performance
- **Optimistic Updates** - Immediate UI feedback

## 🚀 Getting Started

### Prerequisites
- **Node.js 18+** 
- **npm or yarn**
- **MongoDB** database (local or cloud)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/your-org/opsquery.git
cd opsquery
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment Configuration**
Create `.env.local` file:
```env
MONGODB_URI=your_mongodb_connection_string
MONGODB_DATABASE=querymodel
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

4. **Development Server**
```bash
npm run dev
```

5. **Production Build**
```bash
npm run build
npm run start
```

### 📊 Dashboard Access URLs

| Team | URL Path | Access Level | Key Features |
|------|----------|--------------|--------------|
| **Operations** | `/operations` | 🔒 **Full Access** | Query creation, approval workflow |
| **Sales** | `/sales` | 👁️ **View/Respond** | Query responses, messaging |
| **Credit** | `/credit-dashboard` | 👁️ **View/Respond** | Credit assessment, risk tools |
| **Approval** | `/approval-dashboard` | ✅ **Decision Making** | Approve/reject operations requests |
| **Admin** | `/admin-dashboard` | ⚙️ **System Management** | User & system administration |

## 🔧 API Endpoints & Security

### Protected Endpoints

#### 🔒 Query Creation (Operations Only)
```typescript
POST /api/queries
Headers: {
  'x-user-role': 'operations',  // Required
  'x-user-id': 'user123'        // Required
}
Response: 403 if role !== 'operations'
```

#### 💬 Query Actions (All Teams)
```typescript
POST /api/query-actions
// Messaging and responses - accessible by all teams
```

#### ✅ Approvals (Approval Team Only)
```typescript
POST /api/approvals
GET /api/approvals
// Approval workflow - restricted to approval team
```

### Error Handling

#### 403 Forbidden Response
```json
{
  "success": false,
  "error": "Access denied. Query creation is restricted to Operations team only.",
  "code": "INSUFFICIENT_PERMISSIONS"
}
```

## 📈 Real-time Features

### Live Updates
- **Query Status Changes** - Instant status updates across all dashboards
- **New Message Notifications** - Real-time chat message delivery
- **Approval Decisions** - Immediate notification of approval outcomes
- **Team Activity** - Live activity indicators and presence

### Synchronization
- **Cross-dashboard Sync** - Changes visible instantly on all relevant dashboards
- **Message Threading** - Chronological message ordering
- **Status Indicators** - Real-time connection and sync status
- **Automatic Refresh** - Fallback polling for reliability

## 🧪 Testing & Quality Assurance

### Security Testing
- ✅ **Role-based Access Control** - Verified query creation restrictions
- ✅ **API Endpoint Protection** - Confirmed 403 responses for unauthorized access
- ✅ **Frontend Security** - UI components restricted by user role
- ✅ **Authentication Flow** - Login and session management tested

### Component Testing
- ✅ **Operations Components** - AddQuery functionality tested
- ✅ **Sales/Credit Components** - View-only access confirmed
- ✅ **Admin Components** - User management tested
- ✅ **Shared Components** - Chat and messaging functionality

### Workflow Testing
- ✅ **Query Creation Flow** - End-to-end testing completed
- ✅ **Approval Workflow** - Operations → Approval → Resolution tested
- ✅ **Real-time Updates** - Message delivery and synchronization verified
- ✅ **Error Handling** - Permission denied scenarios tested

## 🤝 Contributing

### Development Workflow
1. **Fork** the repository
2. **Create** feature branch (`git checkout -b feature/new-feature`)
3. **Implement** changes following project standards
4. **Test** security and functionality thoroughly
5. **Commit** with clear messages (`git commit -m 'Add new feature'`)
6. **Push** to branch (`git push origin feature/new-feature`)
7. **Create** Pull Request with detailed description

### Code Standards
- **TypeScript** strict mode enabled
- **ESLint** for code quality
- **Security-first** approach for all features
- **Component documentation** required
- **API security** validation mandatory

## 📄 License

This project is licensed under the **MIT License**.

### License Summary
- ✅ **Commercial use** allowed
- ✅ **Modification** allowed  
- ✅ **Distribution** allowed
- ✅ **Private use** allowed
- ❌ **Liability** - No warranty provided
- ❌ **Warranty** - Software provided "as is"

---

## 📞 Support & Documentation

### Getting Help
- **GitHub Issues** - Report bugs and request features
- **Documentation** - Comprehensive guides and API reference
- **Security Issues** - Please report privately to maintainers

### Key Resources
- **API Documentation** - `/api` endpoint reference
- **Component Library** - React component documentation
- **Security Guide** - Role-based access control guide
- **Workflow Documentation** - Process flow diagrams

---

**OpsQuery v2.0** - Secure, Real-time Query Management System
*Streamlining Financial Operations with Role-based Security*

**🔒 Security Summary**: Query creation is exclusively restricted to Operations team. Sales and Credit teams can only view, respond to, and revert queries. This ensures proper workflow control and prevents unauthorized query creation.