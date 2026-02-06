# gaio-validation-lab
Minimalist environment to validate and benchmark generative AI optimization approaches on web-components

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📁 Project Structure

```
/src
  /pages
    /control-group-a  ← Standard DXP Components (baseline)
    /test-group-b     ← Optimized GAIO Components (AI-optimized)
    index.astro       ← Landing page
  /middleware.ts      ← Logging and tracking middleware
/public               ← Static assets
astro.config.mjs      ← Astro configuration with Vercel adapter
```

## 🧪 Testing Groups

### Control Group A
- **Purpose**: Baseline implementation without AI optimization
- **URL**: `/control-group-a`
- **Use Case**: Standard DXP components for comparison

### Test Group B
- **Purpose**: AI-optimized components for validation
- **URL**: `/test-group-b`
- **Use Case**: GAIO (Gen-AI Optimized) components

## 📊 Middleware Logging

The middleware automatically logs:
- Request method and URL
- Response time
- Test group identification
- Custom headers for tracking (`X-Test-Group`, `X-Response-Time`)

## 🌐 Vercel Deployment

This project is configured for easy deployment to Vercel:

1. Push to GitHub
2. Import repository in Vercel
3. Deploy (zero configuration needed)

The project uses `@astrojs/vercel` adapter for serverless deployment.

## 🛠️ Technologies

- **Astro**: Modern static site generator with server-side rendering
- **TypeScript**: Type-safe development
- **Vercel**: Serverless deployment platform
