FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY RozetkaAPI/RozetkaAPI.csproj RozetkaAPI/
RUN dotnet restore RozetkaAPI/RozetkaAPI.csproj
COPY . .
RUN dotnet publish RozetkaAPI/RozetkaAPI.csproj -c Release -o /app /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app .
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "RozetkaAPI.dll"]
