# CarMind - AI Car Buying Advisor

CarMind is an AI-powered car buying advisor that helps UK enthusiasts find the right car for their budget and preferences. It combines conversational financial planning with deep research on ownership costs, maintenance realities, and market pricing.

## Features

- **Financial Intake**: Understands your income, expenses, and savings
- **Smart Recommendations**: AI-powered car suggestions based on budget and preferences
- **Deep Research**: Real market prices, owner experiences, and running cost analysis
- **Insurance Estimation**: Accurate UK insurance premium estimates
- **Budget Planning**: Month-by-month savings plans to reach your car goals
- **PDF Export**: Download your complete budget plan

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS
- **AI**: Claude Sonnet 4.5 (Anthropic), Mastra Framework, Vercel AI SDK
- **Search**: Exa API (semantic web search)
- **Data**: DVLA VES API (UK vehicle data), Supabase (PostgreSQL)
- **Deployment**: Vercel (edge functions, streaming)

## Getting Started

### Prerequisites

- Node.js 18+
- npm/yarn/pnpm
- API keys for:
  - Anthropic Claude
  - Exa Search
  - DVLA VES (UK Government)
  - Supabase

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd carmind
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:

Copy `.env.example` to `.env.local` and fill in your API keys:

```bash
cp .env.example .env.local
```

Required environment variables:
```
ANTHROPIC_API_KEY=your_anthropic_api_key
EXA_API_KEY=your_exa_api_key
DVLA_API_KEY=your_dvla_api_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key
```

### Database Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)

2. Run the migration SQL:
```bash
# Copy the contents of supabase/migrations/20241228_init_schema.sql
# and run it in the Supabase SQL Editor
```

Or use the Supabase CLI:
```bash
npx supabase db push
```

### Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## API Keys Setup

### 1. Anthropic (Claude)

1. Sign up at [console.anthropic.com](https://console.anthropic.com)
2. Create an API key
3. Add to `.env.local` as `ANTHROPIC_API_KEY`

### 2. Exa Search

1. Sign up at [exa.ai](https://exa.ai)
2. Get your API key from the dashboard
3. Add to `.env.local` as `EXA_API_KEY`
4. Note: Exa offers $10 free credit to start

### 3. DVLA VES API

1. Register at [developer-portal.driver-vehicle-licensing.api.gov.uk](https://developer-portal.driver-vehicle-licensing.api.gov.uk)
2. Subscribe to the Vehicle Enquiry Service API
3. Add to `.env.local` as `DVLA_API_KEY`

### 4. Supabase

1. Create project at [supabase.com](https://supabase.com)
2. Get your project URL and keys from Settings > API
3. Add all three keys to `.env.local`

## Project Structure

```
carmind/
├── app/                          # Next.js app router
│   ├── api/                      # API routes
│   │   ├── chat/                 # Chat endpoint (streaming)
│   │   ├── session/              # Session management
│   │   ├── research/             # Car research endpoint
│   │   └── export/               # PDF export
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Main page
├── components/                   # React components
│   ├── chat/                     # Chat UI components
│   └── ui/                       # Reusable UI components
├── lib/                          # Core logic
│   ├── db/                       # Database utilities
│   ├── mastra/                   # Agent & tools
│   ├── models/                   # Calculation models
│   └── utils/                    # Helper functions
├── types/                        # TypeScript types
└── supabase/                     # Database migrations
```

## Key Components

### Mastra Agent

The CarMind agent orchestrates the conversation flow and uses specialized tools:

- `searchCarPrices` - Search UK market prices
- `searchOwnerExperiences` - Find owner reviews and reliability info
- `lookupVehicleData` - DVLA vehicle lookup
- `estimateInsurance` - Calculate insurance premiums
- `calculateBudget` - Determine affordability
- `generateBudgetPlan` - Create savings timeline

### Insurance Model

Estimates UK car insurance based on:
- Driver age
- Insurance group (1-50)
- Location (postcode)
- No Claims Bonus (NCB)
- Annual mileage

### Budget Calculator

Calculates:
- Emergency fund requirements
- Maximum car purchase price
- Monthly running cost budget
- Months until purchase-ready

## Deployment

### Deploy to Vercel

1. Push code to GitHub

2. Import project to Vercel:
```bash
vercel
```

3. Add environment variables in Vercel dashboard

4. Deploy!

The app uses Edge Functions for optimal performance.

### Database Migration

Ensure your Supabase migrations are applied before deployment:

```bash
npx supabase db push
```

## Usage

1. **Start a Session**: Visit the homepage to begin
2. **Financial Intake**: Answer questions about your income and expenses
3. **Preferences**: Describe your ideal car and driving style
4. **Get Suggestions**: Receive AI-matched car recommendations
5. **Deep Research**: Select cars to research in detail
6. **Budget Plan**: Get a month-by-month savings plan
7. **Export**: Download your plan as PDF

## Development Roadmap

- [x] Financial intake & budget calculation
- [x] Car suggestions with Claude Sonnet 4.5
- [x] Deep research with Exa search
- [x] Insurance estimation model
- [x] Budget plan generation
- [x] PDF export
- [ ] Enhanced comparison view
- [ ] Appreciation predictions (v2)
- [ ] Finance calculator (PCP/HP)
- [ ] Email notifications
- [ ] Mobile native app

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

[Your chosen license]

## Support

For issues and questions:
- Open an issue on GitHub
- Email: [your email]

## Acknowledgments

- Built with [Mastra](https://mastra.ai) and [Vercel AI SDK](https://sdk.vercel.ai)
- Powered by [Claude](https://anthropic.com) and [Exa](https://exa.ai)
- UK vehicle data from [DVLA](https://www.gov.uk/dvla)

---

Made with ❤️ for UK car enthusiasts
