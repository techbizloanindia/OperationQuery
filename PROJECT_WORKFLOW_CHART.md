# OPS Query Management System - Complete Workflow Chart

## 🏗️ System Architecture Overview

This is a comprehensive Next.js-based query management system that handles loan applications, credit assessments, and approval workflows across multiple teams.

---

## 👥 User Roles & Access Matrix

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER ROLES & PERMISSIONS                │
├─────────────────────────────────────────────────────────────────┤
│ SALES TEAM      │ → Query Creation                               │
│                 │ → Customer Communication                       │
│                 │ → Branch-specific Access                       │
├─────────────────┼─────────────────────────────────────────────────┤
│ CREDIT TEAM     │ → Risk Assessment                              │
│                 │ → Credit Evaluation                            │
│                 │ → Query Resolution                             │
├─────────────────┼─────────────────────────────────────────────────┤
│ OPERATIONS TEAM │ → Query Management                             │
│                 │ → Team Assignment                              │
│                 │ → Status Monitoring                            │
│                 │ → Approval Workflows                           │
├─────────────────┼─────────────────────────────────────────────────┤
│ APPROVAL TEAM   │ → Final Approvals                              │
│                 │ → Workflow Management                          │
│                 │ → Decision Authority                           │
├─────────────────┼─────────────────────────────────────────────────┤
│ ADMIN           │ → System Configuration                         │
│                 │ → User Management                              │
│                 │ → Full System Access                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Complete System Workflow

### Phase 1: Authentication & Dashboard Access

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Login Page    │───▶│  Authentication │───▶│ Role-based      │
│                 │    │   Validation    │    │ Dashboard       │
│ - Employee ID   │    │                 │    │ Routing         │
│ - Password      │    │ API: /auth/login│    │                 │
│ - Branch Code   │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       ▼
         │                       │           ┌─────────────────────┐
         │                       │           │ Dashboard Selection │
         │                       │           ├─────────────────────┤
         │                       │           │ • Sales Dashboard   │
         │                       │           │ • Credit Dashboard  │
         │                       │           │ • Operations        │
         │                       │           │ • Approval Center   │
         │                       │           │ • Admin Panel       │
         │                       │           └─────────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│ Error Handling  │    │ Session Storage │
│                 │    │                 │
│ - Invalid Creds │    │ - User Context  │
│ - Retry Logic   │    │ - Role Perms    │
│ - Branch Access │    │ - Branch Access │
└─────────────────┘    └─────────────────┘
```

### Phase 2: Query Creation & Management

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Query Creation  │───▶│ Application     │───▶│ Initial Status  │
│ (Sales Team)    │    │ Processing      │    │ Assignment      │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • Customer Info │    │ • Data Validation│    │ Status: pending │
│ • Query Text    │    │ • App Number Gen│    │ Team: Unassigned│
│ • Priority      │    │ • Database Save │    │ TAT: 24 hours   │
│ • Branch Code   │    │ • Event Logging │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    OPERATIONS TEAM WORKFLOW                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │Query Review │─▶│Team Assign  │─▶│Status Update│              │
│  │             │  │             │  │             │              │
│  │• Assess     │  │• Sales      │  │• Track TAT  │              │
│  │• Prioritize │  │• Credit     │  │• Monitor    │              │
│  │• Categorize │  │• Both Teams │  │• Notify     │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Phase 3: Team Assignment & Processing

```
                    ┌─────────────────────────────────┐
                    │      OPERATIONS ASSIGNMENT      │
                    └─────────────────┬───────────────┘
                                      │
                    ┌─────────────────▼───────────────┐
                    │        Query Analysis           │
                    │                                 │
                    │ • Customer Type Assessment      │
                    │ • Risk Level Evaluation         │
                    │ • Complexity Analysis           │
                    │ • Resource Availability         │
                    └─────┬───────────────────┬───────┘
                          │                   │
           ┌──────────────▼──────────┐       ▼──────────────┐
           │     SALES TEAM          │   CREDIT TEAM        │
           │     ASSIGNMENT          │   ASSIGNMENT         │
           ├─────────────────────────┤   ├──────────────────┤
           │                         │   │                  │
           │ ┌─────────────────────┐ │   │ ┌────────────────┤
           │ │ Customer Relations  │ │   │ │ Risk Assessment│
           │ │ • Follow-ups        │ │   │ │ • Credit Check │
           │ │ • Documentation     │ │   │ │ • Eligibility  │
           │ │ • Communication     │ │   │ │ • Validation   │
           │ └─────────────────────┘ │   │ └────────────────┤
           │                         │   │                  │
           │ ┌─────────────────────┐ │   │ ┌────────────────┤
           │ │ Query Resolution    │ │   │ │ Decision Making│
           │ │ • Information Gather│ │   │ │ • Approve      │
           │ │ • Customer Contact  │ │   │ │ • Defer        │
           │ │ • Status Updates    │ │   │ │ • OTC (Other)  │
           │ └─────────────────────┘ │   │ └────────────────┤
           └─────────────────────────┘   └──────────────────┘
                          │                   │
                          └──────────┬────────┘
                                     │
                           ┌─────────▼─────────┐
                           │   COLLABORATION   │
                           │                   │
                           │ • Chat Interface  │
                           │ • File Sharing    │
                           │ • Status Updates  │
                           │ • Joint Decisions │
                           └───────────────────┘
```

### Phase 4: Query Status Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            QUERY STATUS LIFECYCLE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────┐    ┌──────────────┐    ┌──────────────┐    ┌─────────────────┐ │
│  │ PENDING │───▶│ IN_PROGRESS  │───▶│ TEAM_REVIEW  │───▶│ WAITING_APPROVAL│ │
│  │         │    │              │    │              │    │                 │ │
│  │Initial  │    │Assigned to   │    │Internal      │    │Escalated to     │ │
│  │Status   │    │Team/Member   │    │Discussion    │    │Approval Team    │ │
│  └─────────┘    └──────────────┘    └──────────────┘    └─────────────────┘ │
│       │               │                    │                     │         │
│       │               │                    │                     │         │
│       │               ▼                    ▼                     ▼         │
│       │    ┌──────────────┐    ┌──────────────┐    ┌─────────────────┐     │
│       │    │  CUSTOMER    │    │   INTERNAL   │    │   FINAL         │     │
│       │    │  CONTACT     │    │   REVIEW     │    │   DECISION      │     │
│       │    │              │    │              │    │                 │     │
│       │    │Info Request  │    │Team Collab   │    │Approve/Defer/OTC│     │
│       │    │Documentation│    │Quality Check │    │                 │     │
│       │    └──────────────┘    └──────────────┘    └─────────────────┘     │
│       │               │                    │                     │         │
│       │               │                    │                     │         │
│       │               ▼                    ▼                     ▼         │
│       │    ┌─────────────────────────────────────────────────────────────┐ │
│       └───▶│                    RESOLUTION PHASE                        │ │
│            ├─────────────────────────────────────────────────────────────┤ │
│            │                                                             │ │
│            │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │ │
│            │  │  APPROVED   │  │  DEFERRED   │  │     OTC     │        │ │
│            │  │             │  │             │  │             │        │ │
│            │  │Final Accept │  │Delayed      │  │Other Action │        │ │
│            │  │Customer     │  │Additional   │  │Required     │        │ │
│            │  │Notification │  │Info Needed  │  │             │        │ │
│            │  └─────────────┘  └─────────────┘  └─────────────┘        │ │
│            │         │               │               │                  │ │
│            │         └───────────────┼───────────────┘                  │ │
│            │                         │                                  │ │
│            │                         ▼                                  │ │
│            │              ┌─────────────────┐                           │ │
│            │              │   RESOLVED      │                           │ │
│            │              │                 │                           │ │
│            │              │ Final Status    │                           │ │
│            │              │ Archive Record  │                           │ │
│            │              │ Generate Report │                           │ │
│            │              └─────────────────┘                           │ │
│            └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Phase 5: Approval Workflow System

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           APPROVAL WORKFLOW SYSTEM                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────────┐   │
│  │ APPROVAL REQUEST│───▶│ AUTHORIZATION   │───▶│    DECISION MATRIX      │   │
│  │                 │    │ VALIDATION      │    │                         │   │
│  │• Query Details  │    │                 │    │ ┌─────────────────────┐ │   │
│  │• Proposed Action│    │• User Authority │    │ │     LOW RISK        │ │   │
│  │• Risk Assessment│    │• Role Validation│    │ │  Auto-Approval      │ │   │
│  │• Financial Impact│    │• Branch Access  │    │ │  ≤ $10,000          │ │   │
│  └─────────────────┘    └─────────────────┘    │ └─────────────────────┘ │   │
│           │                       │            │                         │   │
│           │                       │            │ ┌─────────────────────┐ │   │
│           │                       │            │ │   MEDIUM RISK       │ │   │
│           │                       │            │ │ Manager Approval    │ │   │
│           │                       │            │ │ $10,001 - $50,000   │ │   │
│           │                       │            │ └─────────────────────┘ │   │
│           │                       │            │                         │   │
│           │                       │            │ ┌─────────────────────┐ │   │
│           │                       │            │ │    HIGH RISK        │ │   │
│           │                       │            │ │ Senior Approval     │ │   │
│           │                       │            │ │  > $50,000          │ │   │
│           │                       │            │ └─────────────────────┘ │   │
│           │                       │            └─────────────────────────┘   │
│           │                       │                       │                  │
│           ▼                       ▼                       ▼                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                      APPROVAL PROCESSING ENGINE                        │ │
│  ├─────────────────────────────────────────────────────────────────────────┤ │
│  │                                                                         │ │
│  │  Parallel Processing Paths:                                            │ │
│  │                                                                         │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐ │ │
│  │  │  NOTIFICATION   │  │   DOCUMENTATION │  │    AUDIT TRAIL          │ │ │
│  │  │   SYSTEM        │  │    GENERATION   │  │                         │ │ │
│  │  │                 │  │                 │  │ • All Actions Logged    │ │ │
│  │  │• Email Alerts   │  │• Approval Forms │  │ • Timestamp Records     │ │ │
│  │  │• SMS Updates    │  │• Digital Signatures│ • User Activity         │ │ │
│  │  │• Dashboard      │  │• Compliance Docs│  │ • Decision Rationale    │ │ │
│  │  │  Notifications  │  │• Audit Reports  │  │ • Status Changes        │ │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────────┘ │ │
│  │           │                     │                     │                │ │
│  │           └─────────────────────┼─────────────────────┘                │ │
│  │                                 │                                      │ │
│  │                                 ▼                                      │ │
│  │                    ┌─────────────────────┐                             │ │
│  │                    │   FINAL STATUS      │                             │ │
│  │                    │    DISTRIBUTION     │                             │ │
│  │                    │                     │                             │ │
│  │                    │ • Update All Systems│                             │ │
│  │                    │ • Notify Stakeholders│                            │ │
│  │                    │ • Archive Decision  │                             │ │
│  │                    │ • Generate Reports  │                             │ │
│  │                    └─────────────────────┘                             │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Phase 6: Real-time Communication & Collaboration

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      REAL-TIME COMMUNICATION SYSTEM                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────────┐   │
│  │ CHAT INTERFACE  │───▶│  MESSAGE QUEUE  │───▶│   BROADCAST SYSTEM      │   │
│  │                 │    │                 │    │                         │   │
│  │• Modern UI      │    │• Real-time      │    │ ┌─────────────────────┐ │   │
│  │• File Sharing   │    │  Processing     │    │ │   SERVER-SENT       │ │   │
│  │• Emoji Support  │    │• Message        │    │ │    EVENTS (SSE)     │ │   │
│  │• Read Receipts  │    │  Validation     │    │ │                     │ │   │
│  │• Typing Indicators│   │• Spam Control   │    │ │ • Live Updates      │ │   │
│  └─────────────────┘    └─────────────────┘    │ │ • Status Changes    │ │   │
│                                                │ │ • New Messages      │ │   │
│  ┌─────────────────┐    ┌─────────────────┐    │ │ • System Alerts     │ │   │
│  │  TEAM CHANNELS  │───▶│ PERMISSION      │    │ └─────────────────────┘ │   │
│  │                 │    │ MANAGEMENT      │    │                         │   │
│  │• Sales Channel  │    │                 │    │ ┌─────────────────────┐ │   │
│  │• Credit Channel │    │• Role-based     │    │ │   PUSH              │ │   │
│  │• Operations Hub │    │  Access         │    │ │  NOTIFICATIONS      │ │   │
│  │• Private DMs    │    │• Channel        │    │ │                     │ │   │
│  │• Query-specific │    │  Permissions    │    │ │ • Browser Alerts    │ │   │
│  └─────────────────┘    └─────────────────┘    │ │ • Mobile Push       │ │   │
│                                                │ │ • Email Fallback    │ │   │
│  ┌─────────────────────────────────────────────┤ │ • SMS Critical      │ │   │
│  │           COLLABORATIVE FEATURES            │ └─────────────────────┘ │   │
│  ├─────────────────────────────────────────────┤                         │   │
│  │                                             │                         │   │
│  │ ┌─────────────┐ ┌─────────────┐ ┌─────────┤                         │   │
│  │ │ QUERY       │ │ STATUS      │ │ DECISION│                         │   │
│  │ │ ASSIGNMENT  │ │ TRACKING    │ │ SUPPORT │                         │   │
│  │ │             │ │             │ │         │                         │   │
│  │ │• Auto Route │ │• Real-time  │ │• Voting │                         │   │
│  │ │• Manual     │ │• Visual     │ │• Polls  │                         │   │
│  │ │• Escalation │ │• Analytics  │ │• Reviews│                         │   │
│  │ └─────────────┘ └─────────────┘ └─────────┤                         │   │
│  │                                             │                         │   │
│  └─────────────────────────────────────────────┘                         │   │
│                                                                         │   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Phase 7: Reporting & Analytics Dashboard

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        REPORTING & ANALYTICS SYSTEM                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                        DATA COLLECTION LAYER                           │ │
│  ├─────────────────────────────────────────────────────────────────────────┤ │
│  │                                                                         │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐   │ │
│  │  │   QUERY     │ │  USER       │ │ PERFORMANCE │ │    BUSINESS     │   │ │
│  │  │  METRICS    │ │ ACTIVITY    │ │   METRICS   │ │    METRICS      │   │ │
│  │  │             │ │             │ │             │ │                 │   │ │
│  │  │• Volume     │ │• Login      │ │• Response   │ │• Revenue        │   │ │
│  │  │• Status     │ │• Actions    │ │  Time       │ │  Impact         │   │ │
│  │  │• Priority   │ │• Duration   │ │• Resolution │ │• Customer       │   │ │
│  │  │• Type       │ │• Team       │ │  Rate       │ │  Satisfaction   │   │ │
│  │  │• Source     │ │  Collab     │ │• TAT        │ │• Conversion     │   │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────┘   │ │
│  │           │              │              │                │             │ │
│  │           └──────────────┼──────────────┼────────────────┘             │ │
│  │                          │              │                               │ │
│  └──────────────────────────┼──────────────┼───────────────────────────────┘ │
│                             │              │                                 │
│  ┌──────────────────────────▼──────────────▼───────────────────────────────┐ │
│  │                     ANALYTICS PROCESSING ENGINE                        │ │
│  ├─────────────────────────────────────────────────────────────────────────┤ │
│  │                                                                         │ │
│  │  Real-time Data Processing:                                             │ │
│  │                                                                         │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐ │ │
│  │  │   AGGREGATION   │  │   TREND         │  │   PREDICTIVE           │ │ │
│  │  │                 │  │   ANALYSIS      │  │   ANALYTICS            │ │ │
│  │  │• Sum, Avg, Max  │  │                 │  │                        │ │ │
│  │  │• Count, Min     │  │• Time Series    │  │• Query Volume          │ │ │
│  │  │• Grouping       │  │• Seasonal       │  │  Forecasting           │ │ │
│  │  │• Filtering      │  │  Patterns       │  │• Resource Planning     │ │ │
│  │  │                 │  │• Growth Rates   │  │• Risk Assessment       │ │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────────┘ │ │
│  │           │                     │                     │                │ │
│  │           └─────────────────────┼─────────────────────┘                │ │
│  │                                 │                                      │ │
│  └─────────────────────────────────┼──────────────────────────────────────┘ │
│                                    │                                        │
│  ┌─────────────────────────────────▼──────────────────────────────────────┐ │
│  │                          DASHBOARD VISUALIZATION                       │ │
│  ├─────────────────────────────────────────────────────────────────────────┤ │
│  │                                                                         │ │
│  │  Multi-Dashboard System:                                                │ │
│  │                                                                         │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐ │ │
│  │  │ EXECUTIVE       │  │ OPERATIONAL     │  │   TEAM-SPECIFIC         │ │ │
│  │  │ DASHBOARD       │  │ DASHBOARD       │  │   DASHBOARDS            │ │ │
│  │  │                 │  │                 │  │                         │ │ │
│  │  │• KPI Overview   │  │• Real-time      │  │ ┌─────────────────────┐ │ │ │
│  │  │• Strategic      │  │  Monitoring     │  │ │ Sales Dashboard     │ │ │ │
│  │  │  Metrics        │  │• Queue Status   │  │ │ • Lead Conversion   │ │ │ │
│  │  │• High-level     │  │• SLA Tracking   │  │ │ • Customer Queries  │ │ │ │
│  │  │  Trends         │  │• Team           │  │ │ • Performance       │ │ │ │
│  │  │• Financial      │  │  Performance    │  │ └─────────────────────┘ │ │ │
│  │  │  Impact         │  │• Alert System   │  │                         │ │ │
│  │  │• Compliance     │  │                 │  │ ┌─────────────────────┐ │ │ │
│  │  └─────────────────┘  └─────────────────┘  │ │ Credit Dashboard    │ │ │ │
│  │                                            │ │ • Risk Assessment   │ │ │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  │ │ • Approval Rates    │ │ │ │
│  │  │ INTERACTIVE     │  │ EXPORT &        │  │ │ • Portfolio Health  │ │ │ │
│  │  │ FEATURES        │  │ SHARING         │  │ └─────────────────────┘ │ │ │
│  │  │                 │  │                 │  │                         │ │ │
│  │  │• Drill-down     │  │• PDF Reports    │  │ ┌─────────────────────┐ │ │ │
│  │  │• Filtering      │  │• Excel Export   │  │ │Operations Dashboard │ │ │ │
│  │  │• Time Range     │  │• Email Delivery │  │ │ • Query Management  │ │ │ │
│  │  │• Comparison     │  │• Scheduled      │  │ │ • Team Workload     │ │ │ │
│  │  │• Zoom & Pan     │  │  Reports        │  │ │ • System Health     │ │ │ │
│  │  └─────────────────┘  └─────────────────┘  │ └─────────────────────┘ │ │ │
│  │                                            └─────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Technical Architecture

### Database Schema & APIs

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API ENDPOINTS                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ AUTHENTICATION                    │ QUERY MANAGEMENT                       │
│ • /api/auth/login                 │ • /api/queries                         │
│ • /api/users                      │ • /api/queries/[queryId]               │
│ • /api/users/check-role           │ • /api/queries/[queryId]/chat          │
│                                   │ • /api/queries/[queryId]/remarks       │
│ APPLICATIONS                      │ • /api/query-actions                   │
│ • /api/applications               │ • /api/query-responses                 │
│ • /api/applications/[appNo]       │                                        │
│ • /api/applications/stats         │ APPROVALS                              │
│                                   │ • /api/approvals                       │
│ REAL-TIME COMMUNICATION           │ • /api/test-approval-flow              │
│ • /api/queries/events             │                                        │
│ • /api/queries/[queryId]/chat/    │ REPORTING                              │
│   events                          │ • /api/reports                         │
│ • /api/test-realtime              │ • /api/reports/generate                │
│                                   │ • /api/queries/analytics               │
│ SYSTEM ADMINISTRATION             │                                        │
│ • /api/branches                   │ DATA MANAGEMENT                        │
│ • /api/settings                   │ • /api/csv-upload                      │
│ • /api/health                     │ • /api/bulk-upload                     │
│ • /api/database-info              │ • /api/sanctioned-applications         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                               DATA FLOW                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Frontend (Next.js)                                                         │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────────┐   │
│  │ React           │───▶│ TanStack Query  │───▶│ Server Components       │   │
│  │ Components      │    │ (Data Fetching) │    │ (SSR/SSG)               │   │
│  │                 │    │                 │    │                         │   │
│  │• Dashboard UI   │    │• Caching        │    │• Page Generation        │   │
│  │• Forms          │    │• Mutations      │    │• SEO Optimization       │   │
│  │• Charts         │    │• Background     │    │• Performance            │   │
│  │• Chat Interface │    │  Sync           │    │                         │   │
│  └─────────────────┘    └─────────────────┘    └─────────────────────────┘   │
│           │                       │                       │                 │
│           └───────────────────────┼───────────────────────┘                 │
│                                   │                                         │
│  Backend (API Routes)             │                                         │
│  ┌─────────────────────────────────▼─────────────────────────────────────┐   │
│  │                           API Layer                                   │   │
│  ├───────────────────────────────────────────────────────────────────────┤   │
│  │                                                                       │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐ │   │
│  │  │ROUTE        │ │MIDDLEWARE   │ │VALIDATION   │ │ERROR            │ │   │
│  │  │HANDLERS     │ │             │ │             │ │HANDLING         │ │   │
│  │  │             │ │• Auth Check │ │• Input      │ │                 │ │   │
│  │  │• REST APIs  │ │• CORS       │ │  Validation │ │• Try-Catch      │ │   │
│  │  │• Business   │ │• Rate       │ │• Schema     │ │• Status Codes   │ │   │
│  │  │  Logic      │ │  Limiting   │ │  Validation │ │• Error Messages │ │   │
│  │  │• Response   │ │• Logging    │ │• Type       │ │• Logging        │ │   │
│  │  │  Formatting │ │             │ │  Checking   │ │                 │ │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────┘ │   │
│  │           │              │              │                │           │   │
│  │           └──────────────┼──────────────┼────────────────┘           │   │
│  │                          │              │                             │   │
│  │                          ▼              ▼                             │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │   │
│  │  │                    DATA PERSISTENCE                            │ │   │
│  │  ├─────────────────────────────────────────────────────────────────┤ │   │
│  │  │                                                                 │ │   │
│  │  │  In-Memory Storage (Development):                               │ │   │
│  │  │  • global.queryDatabase                                        │ │   │
│  │  │  • global.queryMessagesDatabase                               │ │   │
│  │  │  • global.approvalRequestsDatabase                           │ │   │
│  │  │  • queryActionsDatabase                                        │ │   │
│  │  │                                                                 │ │   │
│  │  │  Production Ready:                                              │ │   │
│  │  │  • Database Integration Points                                  │ │   │
│  │  │  • Connection Pooling                                           │ │   │
│  │  │  • Transaction Management                                       │ │   │
│  │  │  • Data Backup & Recovery                                       │ │   │
│  │  └─────────────────────────────────────────────────────────────────┘ │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Real-time Communication                                                    │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                    SERVER-SENT EVENTS (SSE)                            │ │
│  │                                                                         │ │
│  │  • Event Streaming: /api/queries/events                                │ │
│  │  • Query-specific Events: /api/queries/[queryId]/chat/events           │ │
│  │  • Real-time Updates: Status changes, new messages, approvals          │ │
│  │  • Connection Management: Auto-reconnection, heartbeat                 │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Key Features & Capabilities

### Security & Access Control
- **Role-based Access Control (RBAC)**: Each user type has specific permissions
- **Branch-level Security**: Users can only access queries from their assigned branches
- **Session Management**: Secure authentication with localStorage persistence
- **Audit Trail**: All actions are logged with timestamps and user information

### Performance Optimization
- **Server-Side Rendering (SSR)**: Fast initial page loads
- **Static Site Generation (SSG)**: Pre-built pages for better performance
- **Caching Strategy**: TanStack Query for efficient data caching
- **Real-time Updates**: Server-Sent Events for live communication

### User Experience
- **Modern Chat Interface**: Real-time messaging with file sharing
- **Responsive Design**: Works seamlessly across desktop and mobile devices
- **Dashboard Customization**: Role-specific dashboards with relevant metrics
- **Notification System**: Multi-channel alerts (browser, email, SMS)

### Business Intelligence
- **Advanced Analytics**: Predictive analytics for resource planning
- **Custom Reports**: Exportable reports in multiple formats
- **Performance Metrics**: KPI tracking and trend analysis
- **Compliance Monitoring**: Audit trails and regulatory reporting

---

## 🔄 Workflow Summary

1. **Authentication**: Users log in with role-based access
2. **Query Creation**: Sales team creates queries with customer information
3. **Assignment**: Operations team assigns queries to appropriate teams
4. **Processing**: Credit/Sales teams work on assigned queries
5. **Collaboration**: Real-time communication throughout the process
6. **Approval**: Complex queries go through approval workflows
7. **Resolution**: Final decisions are made and communicated
8. **Reporting**: Analytics and reports are generated for insights

This comprehensive workflow ensures efficient query management, proper authorization, and seamless collaboration across all teams while maintaining security and compliance standards.