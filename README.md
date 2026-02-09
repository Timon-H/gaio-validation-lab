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
  /layouts
    BaseLayout.astro  ← A/B testing layout system
  /pages
    index.astro       ← Landing page (Group B with schema)
    /control-group-a
      index.astro     ← Control group (Group A)
    /test-group-b
      index.astro     ← Test group (Group B with schema)
  /middleware.ts      ← Logging and tracking middleware
/public               ← Static assets
astro.config.mjs      ← Astro configuration with Vercel adapter
```

## 🧪 Testing Groups & A/B Testing System

### BaseLayout A/B Testing
The `BaseLayout.astro` implements a sophisticated A/B testing system that differentiates between control and optimized groups at the layout level.

#### Group A (Control) - Standard Implementation
- **Structure**: Basic HTML with `<div>` containers
- **Metadata**: Standard meta tags only
- **SEO**: Traditional approach
- **Example**: `/control-group-a`

#### Group B (Test) - GAIO Optimized
- **Structure**: Semantic HTML5 (`<main>`, `<article>`, `<header>`)
- **Metadata**: Enhanced robots meta, canonical URLs
- **SEO**: JSON-LD structured data (Schema.org)
- **Accessibility**: ARIA labels
- **Example**: `/test-group-b`

### How to Use BaseLayout

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';

// For Group B: Define JSON-LD schema
const mySchema = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "Your Article Title",
  "description": "Your description",
  // ... more schema properties
};
---

<BaseLayout 
  title="Your Page Title" 
  description="Your page description" 
  group="B"              <!-- 'A' for control, 'B' for optimized -->
  schemaData={mySchema}  <!-- Optional, only for Group B -->
>
  <!-- Your page content here -->
</BaseLayout>
```

### Key Differences: Group A vs Group B

| Feature | Group A (Control) | Group B (GAIO) |
|---------|------------------|----------------|
| HTML Structure | `<div id="content">` | `<main><article>` |
| Meta Robots | Default | `index, follow, max-snippet:-1` |
| Canonical URL | ❌ | ✅ |
| JSON-LD Schema | ❌ | ✅ |
| ARIA Labels | ❌ | ✅ |
| Semantic HTML | ❌ | ✅ |

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
- **Supabase**: Open-source Firebase alternative for backend and database
- **Vercel**: Serverless deployment platform
