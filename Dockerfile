FROM node:22-alpine AS builder
# cache-bust: 44
RUN apk add --no-cache git coreutils
WORKDIR /app

RUN git clone --depth 1 --branch v4 https://github.com/jackyzha0/quartz.git .
RUN npm ci

COPY content/ ./content/
COPY quartz.config.ts ./quartz.config.ts
COPY quartz.layout.ts ./quartz.layout.ts
COPY custom.scss /tmp/custom.scss
RUN cat /tmp/custom.scss >> ./quartz/styles/custom.scss

RUN sed -i 's/const height = Math\.min(graph\.offsetHeight,/const height = Math.min(graph.offsetHeight * 3,/g' ./quartz/components/scripts/graph.inline.ts || true
RUN sed -i 's/height: "250px"/height: "700px"/g' ./quartz/components/Graph.tsx || true

COPY GitHubLink.tsx /tmp/GitHubLink.tsx
RUN cp /tmp/GitHubLink.tsx ./quartz/components/GitHubLink.tsx
RUN echo '' >> ./quartz/components/index.ts && echo 'export { default as GitHubLink } from "./GitHubLink"' >> ./quartz/components/index.ts

COPY FolderColors.tsx /tmp/FolderColors.tsx
RUN cp /tmp/FolderColors.tsx ./quartz/components/FolderColors.tsx
RUN echo 'export { default as FolderColors } from "./FolderColors"' >> ./quartz/components/index.ts

COPY Properties.tsx /tmp/Properties.tsx
RUN cp /tmp/Properties.tsx ./quartz/components/Properties.tsx
RUN echo 'export { default as Properties } from "./Properties"' >> ./quartz/components/index.ts

COPY PageTitle.tsx /tmp/PageTitle.tsx
RUN cp /tmp/PageTitle.tsx ./quartz/components/PageTitle.tsx

RUN npx quartz build
RUN ls -la public/ && test -f public/index.html

FROM nginx:alpine
COPY --from=builder /app/public /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
