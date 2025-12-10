###########################################################
# Stage 1: Build the native executable using Maven
###########################################################
FROM quay.io/quarkus/ubi9-quarkus-mandrel-builder-image:jdk-21 AS build

# Set working directory
WORKDIR /code

# Copy Maven wrapper, .mvn folder, and pom.xml
COPY recommendation_manager/mvnw /code/mvnw
COPY recommendation_manager/.mvn /code/.mvn
COPY recommendation_manager/pom.xml /code/

# Switch to non-root user for security
USER quarkus

# Pre-download dependencies for faster build
RUN ./mvnw -B org.apache.maven.plugins:maven-dependency-plugin:3.8.1:go-offline

# Copy source code
COPY recommendation_manager/src /code/src

# Build native executable
RUN ./mvnw package -Dnative

###########################################################
# Stage 2: Create minimal runtime image
###########################################################
FROM quay.io/quarkus/ubi9-quarkus-micro-image:2.0

# Set working directory
WORKDIR /work/

# Copy native executable from build stage
COPY --from=build /code/target/*-runner /work/application

# Set permissions and ownership for security
RUN chmod 775 /work /work/application \
    && chown -R 1001 /work \
    && chmod -R "g+rwX" /work \
    && chown -R 1001:root /work

# Expose application port
EXPOSE 8080

# Run as non-root user
USER 1001

# Start the application, listening on all network interfaces
CMD ["./application", "-Dquarkus.http.host=0.0.0.0"]
