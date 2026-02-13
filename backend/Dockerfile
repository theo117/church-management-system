FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app
COPY . .
RUN chmod +x mvnw && ./mvnw -DskipTests package

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/church-management-api-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8081
CMD ["java","-jar","app.jar"]

