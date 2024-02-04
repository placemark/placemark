FROM node:20-slim
ENV NODE_ENV=development

WORKDIR /home/node/app

ENV PATH /home/node/app/node_modules/.bin:$PATH

RUN apt-get update \
  && apt-get install -y openssl --no-install-recommends \
  && apt-get install -y tini --no-install-recommends \
  && chown -R node:node /home/node/app \
  &&  rm -rf /var/lib/apt/lists/*

# Blitz.js recommends using tini, see why: https://github.com/krallin/tini/issues/8
# ENV TINI_VERSION v0.19.0
# ADD https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini /tini
# RUN chmod +x /tini

USER node

# Install dependencies based on the preferred package manager
COPY  --chown=node:node package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
  if [ -f yarn.lock ]; then yarn config list && yarn install --frozen-lockfile && yarn cache clean --force; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i; \
  # Allow install without lockfile, so example works even without Node.js installed locally
  else echo "Warning: Lockfile not found. It is recommended to commit lockfiles to version control." && yarn install; \
  fi

# TODO: this would be nice to change. Like,
# moving source to src
COPY --chown=node:node  . .

# Next.js collects completely anonymous telemetry data about general usage. Learn more here: https://nextjs.org/telemetry
# Uncomment the following line to disable telemetry at run time
ENV NEXT_TELEMETRY_DISABLED 1

# Note: Don't expose ports here, Compose will handle that for us

ENTRYPOINT ["tini", "--"]

# Start Next.js in development mode based on the preferred package manager
CMD \
  if [ -f yarn.lock ]; then yarn dev; \
  elif [ -f package-lock.json ]; then npm run dev; \
  elif [ -f pnpm-lock.yaml ]; then pnpm dev; \
  else npm run dev; \
  fi
