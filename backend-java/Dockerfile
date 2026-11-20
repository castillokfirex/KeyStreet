FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY pom.xml .
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 \
    mvn -B -ntp -Dmaven.test.skip=true \
    -Djava.net.preferIPv4Stack=true \
    -Dmaven.resolver.transport=wagon \
    -Dmaven.wagon.http.retryHandler.count=5 \
    -Dmaven.wagon.http.pool=false \
    package && cp target/keystreet-backend-*.jar /workspace/app.jar

FROM eclipse-temurin:21-jre
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/* \
 && groupadd -g 10001 app && useradd -u 10001 -g 10001 -M -s /usr/sbin/nologin app \
 && mkdir -p /var/keystreet/pdf-tmp && chown 10001:10001 /var/keystreet/pdf-tmp
WORKDIR /app
COPY --from=build /workspace/app.jar app.jar
USER 10001
EXPOSE 8080
ENTRYPOINT ["java", "-Xms128m", "-Xmx512m", "-jar", "/app/app.jar"]
