import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  server: {
    // In development, forward API calls to the .NET API (dotnet run --urls http://localhost:5199).
    proxy: { '/api': 'http://localhost:5199' },
  },
  build: {
    // The production build is served by the .NET API, from its wwwroot folder.
    outDir: '../EthiopianCalendar.Api/wwwroot',
    emptyOutDir: true,
  },
  test: {
    environment: 'node',
  },
})
