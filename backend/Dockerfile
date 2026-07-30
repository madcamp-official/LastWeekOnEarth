FROM node:20-slim
WORKDIR /app

# 시스템 빌드 도구 설치
RUN apt-get update && apt-get install -y python3 make g++ openssl \
    && rm -rf /var/lib/apt/lists/*

# 1. package.json 관련 파일 먼저 복사 후 의존성 설치
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

# 2. 나머지 소스 코드 및 프리즘 스키마 복사
COPY . .

RUN npx prisma generate
RUN npm run build

EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
