# Gunakan image Node.js LTS Alpine yang sangat ringan & aman
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Copy file konfigurasi package
COPY package*.json ./

# Copy seluruh source code aplikasi
COPY . .

# Expose port
EXPOSE 3000

# Healthcheck untuk memastikan container berjalan lancar
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/payment/midtrans/config || exit 1

# Jalankan server
CMD ["node", "server.js"]
