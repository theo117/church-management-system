# Church Management Backend (Spring Boot)

## Run

1. `cd backend`
2. `mvn spring-boot:run`

API base URL: `http://localhost:8080/api`

Your frontend is already configured to use this default URL.

Set `JWT_SECRET` in the backend runtime environment to a strong random value of at least 32 UTF-8 bytes. Do not commit the value or use a placeholder. Keep it stable across restarts. Rotating it invalidates all existing JWTs, so users must log in again.
