import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    https: {
      key: fs.readFileSync(path.resolve(__dirname, '../../cert/privkey1.pem')),
      cert: fs.readFileSync(path.resolve(__dirname, '../../cert/cert1.pem')),
      ca: fs.readFileSync(path.resolve(__dirname, '../../cert/chain1.pem'))
    },
    host: '0.0.0.0'
  }
})
