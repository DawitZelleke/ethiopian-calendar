# Stage 1: build the React site.
FROM node:22-alpine AS web
WORKDIR /src/web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
RUN npm run build -- --outDir /out/wwwroot

# Stage 2: build and publish the .NET API.
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS api
WORKDIR /src
COPY EthiopianCalendar.Core/ EthiopianCalendar.Core/
COPY EthiopianCalendar.Api/ EthiopianCalendar.Api/
RUN dotnet publish EthiopianCalendar.Api/EthiopianCalendar.Api.csproj -c Release -o /out/app

# Stage 3: the small runtime image. No SDK, no Node, no source code.
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=api /out/app ./
COPY --from=web /out/wwwroot ./wwwroot
USER $APP_UID
# Hosting platforms pass the port in $PORT; default to 8080 locally.
CMD ["sh", "-c", "ASPNETCORE_HTTP_PORTS=${PORT:-8080} exec dotnet EthiopianCalendar.Api.dll"]
