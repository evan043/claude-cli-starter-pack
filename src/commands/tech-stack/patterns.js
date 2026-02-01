/**
 * Detection Patterns for Tech Stack Detection
 *
 * Defines file patterns, packages, and config files that indicate
 * specific technologies are being used in a project.
 */

/**
 * Detection patterns for various technologies
 */
export const DETECTION_PATTERNS = {
  // Frontend frameworks
  frontend: {
    react: {
      packages: ['react', 'react-dom'],
      files: ['src/App.tsx', 'src/App.jsx', 'src/index.tsx'],
      configFiles: ['vite.config.ts', 'vite.config.js', 'craco.config.js'],
    },
    vue: {
      packages: ['vue'],
      files: ['src/App.vue', 'src/main.ts'],
      configFiles: ['vue.config.js', 'vite.config.ts'],
    },
    angular: {
      packages: ['@angular/core'],
      files: ['src/app/app.component.ts'],
      configFiles: ['angular.json'],
    },
    svelte: {
      packages: ['svelte'],
      files: ['src/App.svelte'],
      configFiles: ['svelte.config.js'],
    },
    nextjs: {
      packages: ['next'],
      configFiles: ['next.config.js', 'next.config.mjs', 'next.config.ts'],
    },
    nuxt: {
      packages: ['nuxt'],
      configFiles: ['nuxt.config.ts', 'nuxt.config.js'],
    },
    astro: {
      packages: ['astro'],
      configFiles: ['astro.config.mjs'],
    },
  },

  // Build tools
  buildTool: {
    vite: {
      packages: ['vite'],
      configFiles: ['vite.config.ts', 'vite.config.js'],
    },
    webpack: {
      packages: ['webpack'],
      configFiles: ['webpack.config.js', 'webpack.config.ts'],
    },
    esbuild: {
      packages: ['esbuild'],
    },
    parcel: {
      packages: ['parcel'],
    },
    turbopack: {
      packages: ['turbo'],
      configFiles: ['turbo.json'],
    },
  },

  // State managers
  stateManager: {
    zustand: { packages: ['zustand'] },
    redux: { packages: ['@reduxjs/toolkit', 'redux'] },
    mobx: { packages: ['mobx'] },
    jotai: { packages: ['jotai'] },
    recoil: { packages: ['recoil'] },
    pinia: { packages: ['pinia'] },
    vuex: { packages: ['vuex'] },
  },

  // Backend languages/frameworks
  backend: {
    fastapi: {
      pythonPackages: ['fastapi'],
      files: ['main.py', 'run_api.py', 'app/main.py'],
    },
    express: {
      packages: ['express'],
      files: ['server.js', 'app.js', 'index.js'],
    },
    nestjs: {
      packages: ['@nestjs/core'],
      files: ['src/main.ts'],
    },
    django: {
      pythonPackages: ['django'],
      files: ['manage.py'],
    },
    flask: {
      pythonPackages: ['flask'],
      files: ['app.py', 'wsgi.py'],
    },
    rails: {
      gemPackages: ['rails'],
      files: ['Gemfile', 'config/routes.rb'],
    },
    gin: {
      goPackages: ['github.com/gin-gonic/gin'],
    },
  },

  // Databases
  database: {
    postgresql: {
      envPatterns: ['DATABASE_URL.*postgres', 'POSTGRES_'],
      packages: ['pg', 'psycopg2', 'asyncpg'],
    },
    mysql: {
      envPatterns: ['DATABASE_URL.*mysql', 'MYSQL_'],
      packages: ['mysql2', 'mysqlclient'],
    },
    mongodb: {
      packages: ['mongodb', 'mongoose', 'pymongo'],
    },
    sqlite: {
      files: ['*.db', '*.sqlite', '*.sqlite3'],
    },
  },

  // ORMs
  orm: {
    prisma: {
      packages: ['prisma', '@prisma/client'],
      configFiles: ['prisma/schema.prisma'],
    },
    drizzle: {
      packages: ['drizzle-orm'],
    },
    typeorm: {
      packages: ['typeorm'],
    },
    sqlalchemy: {
      pythonPackages: ['sqlalchemy'],
    },
    sequelize: {
      packages: ['sequelize'],
    },
  },

  // Testing frameworks
  e2eFramework: {
    playwright: {
      packages: ['@playwright/test', 'playwright'],
      configFiles: ['playwright.config.ts', 'playwright.config.js'],
    },
    cypress: {
      packages: ['cypress'],
      configFiles: ['cypress.config.js', 'cypress.config.ts'],
    },
    puppeteer: {
      packages: ['puppeteer'],
    },
  },

  unitFramework: {
    vitest: {
      packages: ['vitest'],
      configFiles: ['vitest.config.ts'],
    },
    jest: {
      packages: ['jest'],
      configFiles: ['jest.config.js', 'jest.config.ts'],
    },
    mocha: {
      packages: ['mocha'],
    },
    pytest: {
      pythonPackages: ['pytest'],
      configFiles: ['pytest.ini', 'pyproject.toml'],
    },
  },

  // Deployment platforms (detected from config files)
  deployment: {
    vercel: {
      configFiles: ['vercel.json'],
    },
    netlify: {
      configFiles: ['netlify.toml'],
    },
    cloudflare: {
      configFiles: ['wrangler.toml', 'wrangler.json'],
    },
    railway: {
      configFiles: ['railway.json', 'railway.toml'],
    },
    docker: {
      configFiles: ['Dockerfile', 'docker-compose.yml', 'docker-compose.yaml'],
    },
  },

  // Tunnel services
  tunnel: {
    ngrok: {
      configFiles: ['ngrok.yml', 'ngrok.yaml'],
      processPatterns: ['ngrok'],
    },
    cloudflare: {
      configFiles: ['.cloudflared/'],
    },
  },
};

export default DETECTION_PATTERNS;
