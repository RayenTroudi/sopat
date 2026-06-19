Project Overview

This project is a custom ERP and Quality Management Platform for SOPAT, a company operating under the ISO 9001:2015 quality management framework.

The platform is intended to replace:

Excel spreadsheets
Dropbox document storage
Manual ISO records
Paper forms
Fragmented project tracking

The goal is to create a centralized platform that manages projects, quality processes, financial tracking, document control, and ISO compliance.

Business Context

SOPAT operates through four primary departments:

1. Étude (Study & Design)

Responsible for:

Client requirements
Site visits
Technical studies
Design preparation
Cost estimation
Quotations
Project planning

Produces:

Technical studies
Design documents
Quotations
Project specifications
Client requirements
2. Réalisation (Execution)

Responsible for:

Project execution
Resource allocation
Material usage
Workforce management
Site operations

Important:

The realization team has historically been resistant to filling administrative forms.

System design must minimize manual data entry requirements.

Never assume extensive user input from field personnel.

Prefer:

Auto-generated forms
AI-assisted suggestions
Validation workflows
Simple approvals

over manual reporting.

3. Qualité (Quality)

Responsible for:

ISO compliance
Inspections
Non-conformities
Corrective actions
Internal audits
Customer validation

Produces:

Inspection reports
NCR records
Corrective actions
Audit reports
Quality records
4. Administration & Finance

Responsible for:

Budget tracking
Supplier management
Purchase orders
Expense management
Contracts
Financial reporting

Produces:

Purchase orders
Expense records
Contracts
Supplier documents
Financial reports
Historical Context

The company possesses historical ISO records dating back to approximately 2005.

These records exist primarily in:

Excel files
PDF documents
Dropbox archives

Historical data should be treated as a strategic asset.

Future AI functionality should leverage this data for:

Budget estimation
Project duration prediction
Cost forecasting
Project similarity analysis
Auto-generated form suggestions
Core Product Principles
Principle 1

Do not digitize Excel.

Replace Excel workflows with structured database-driven processes.

Principle 2

Do not build generic document storage.

Every document should be connected to business entities.

Examples:

Project
Client
Budget
Supplier
Inspection
NCR
Corrective Action
Principle 3

Minimize manual entry.

Whenever possible:

Generate values automatically
Suggest values using historical data
Require validation instead of creation
Principle 4

Maintain ISO 9001 compliance.

Every feature must support traceability and auditability.

Document Management System Requirements

The document management module must support ISO 9001:2015 documented information requirements.

The DMS must not function as a standalone repository.

Documents must be linked to operational processes.

Document Categories
Controlled Documents
Procedures
Work Instructions
Quality Manuals
Policies
Controlled Forms
Inspection Forms
Site Reports
NCR Forms
Corrective Action Forms
Quality Records
Inspection Records
Audit Records
Customer Validation Records
Corrective Action Records
Operational Documents
Project Files
Technical Studies
Quotations
Contracts
Purchase Orders
ISO Document Lifecycle

Every document must support:

Draft
→ Review
→ Approval
→ Effective
→ Revision
→ Obsolete

Required metadata:

Document Number
Title
Department
Version
Revision Number
Author
Reviewer
Approver
Effective Date
Status
Change History
Audit Requirements

Every action must be logged.

Track:

Created By
Modified By
Approved By
Date
Previous Value
New Value

Never delete records.

Use soft deletes whenever possible.

Maintain complete historical traceability.

Permissions Model

Use RBAC.

Roles:

Super Admin
Management
Quality Manager
Quality Agent
Finance Manager
Finance Agent
Study Manager
Study Agent
Realization Manager
Realization Supervisor
Read Only Auditor

Permissions must be department-aware.

Project-Centric Architecture

Projects are the central entity.

Everything must be connected to projects whenever possible.

Examples:

Project
├── Budget
├── Purchase Orders
├── Expenses
├── Technical Documents
├── Photos
├── Quality Inspections
├── NCRs
├── Corrective Actions
├── Contracts
└── Client Communications

AI Strategy

AI must not replace responsible personnel.

AI should:

Suggest values
Predict budgets
Predict project duration
Auto-fill forms
Recommend corrective actions

Humans remain responsible for validation.

Store:

Suggested Value
Approved Value
User
Timestamp

for all AI-assisted workflows.

Technical Stack

Current Stack:

Next.js
TypeScript
PostgreSQL
Prisma
Tailwind CSS

When generating code:

Follow existing architecture
Reuse existing patterns
Avoid creating parallel systems
Keep implementation production-ready
Development Rules

Before implementing any feature:

Analyze existing schema
Analyze existing project structure
Reuse existing abstractions
Avoid duplicate functionality
Ensure ISO compliance
Ensure auditability
Ensure scalability

Always propose:

Database schema
Prisma models
API routes
Permission checks
Audit logging strategy
UI architecture

before writing implementation code.

The platform should evolve into a complete ISO 9001-compliant ERP and Quality Management System rather than a simple project management tool.