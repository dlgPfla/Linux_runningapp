# 1단계: 빌드
FROM node:18-alpine AS builder

WORKDIR /app

# 패키지 설치
COPY package*.json ./
RUN npm install

# 소스 복사 및 빌드
COPY . .
RUN npm run build

# 2단계: nginx로 서빙
FROM nginx:alpine

# 빌드 결과물 복사
COPY --from=builder /app/dist /usr/share/nginx/html

# React Router 새로고침 대응용 nginx 설정 복사
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 80포트 오픈
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]