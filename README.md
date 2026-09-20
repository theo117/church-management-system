# Church Management System

Church administration platform with a Java Spring Boot API, JavaScript frontend, member and event management, donations, reporting, and frontend verification tests.

This project is a business-facing application for managing church operations, including member records, attendance, events, donations, and reporting. It combines a Java backend with a frontend that supports day-to-day operational tasks and form-based workflows.

## Overview

The system supports core administrative tasks such as:

- member management
- attendance tracking
- event coordination
- donation records
- volunteer and communication workflows
- reporting and dashboard summaries

The project demonstrates a practical full-stack workflow with server-side processing, client-side interactivity, and validation-focused UI behavior.

## Features

- Member CRUD and profile management
- Attendance and reporting
- Event scheduling and management
- Donation tracking
- Volunteer and communication management
- Responsive dashboard interfaces
- Frontend verification tests for UI and workflow behavior
- API-based synchronization between frontend and backend

## Tech Stack

### Backend
- Java
- Spring Boot
- REST APIs
- MySQL/PostgreSQL compatibility
- Authentication and authorization patterns

### Frontend
- HTML
- CSS
- JavaScript
- Modular JavaScript application structure

### Testing
- JavaScript frontend tests
- form validation checks
- API and workflow verification

## Architecture

The application is structured around a Java backend and a modular frontend.

- The backend provides the application API and data handling.
- The frontend is organized into feature modules for members, events, donations, attendance, and reporting.
- API calls are coordinated through shared request and state management logic.
- Validation and user feedback are handled in shared UI modules.
- The project includes verification tests for frontend behavior and data flow.

## Screenshots

Add screenshots of:

- dashboard overview
- member management
- attendance tracker
- donation workflow
- reporting dashboard

## Getting Started

### Backend

```bash
cd backend
mvn spring-boot:run
```

### Frontend

Serve the app locally:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Testing

The project includes frontend verification tests focused on:

- form validation
- CRUD behavior
- data state management
- UI interaction and error handling

Example commands:

```bash
NODE_PATH=/tmp/cms-test-tools/node_modules node --experimental-vm-modules tests/frontend.cjs
NODE_PATH=/tmp/cms-test-tools/node_modules node --experimental-vm-modules tests/events.cjs
NODE_PATH=/tmp/cms-test-tools/node_modules node --experimental-vm-modules tests/dashboard.cjs
NODE_PATH=/tmp/cms-test-tools/node_modules node --experimental-vm-modules tests/api.cjs
```

## Deployment

This project is structured for local and test deployment, with backend/API services and a frontend that can be served over HTTP.

## What I Learned

This project helped me practice:

- backend and frontend integration
- modular JavaScript application architecture
- form validation and user feedback
- API-based UI patterns
- testing and regression prevention
- maintainable everyday application workflows

## Future Improvements

- improve overall project documentation and onboarding
- consolidate backend, frontend, and test documentation
- add clearer setup instructions for local environment configuration
- add more automated backend and API tests
- improve architecture documentation for future maintainers
