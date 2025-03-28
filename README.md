# RevAI

RevAI er et AI-drevet værktøj til systematiske reviews, der hjælper forskere med at effektivisere artikelscreeningsprocessen.

## Funktioner

- **AI-screening**: Kunstig intelligens hjælper med at screene artikler baseret på dine inklusionskriterier
- **Nem tekstanalyse**: Gennemgå abstracts og fuldtekst-artikler i en struktureret og brugervenlig grænseflade
- **Tidsbesparende**: Reducer den tid, du bruger på manuel screening af artikler med op til 50%
- **Datadrevet indsigt**: Få visuel indsigt i dit review-fremskridt og beslutninger undervejs
- **Brugervenlig**: Fokuser på dit forskningsindhold, ikke på at lære kompliceret software

## Teknologier

Dette projekt er bygget med:

- [Next.js](https://nextjs.org/) - React framework
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Shadcn/UI](https://ui.shadcn.com/) - UI komponentbibliotek
- [Supabase](https://supabase.com/) - Backend og database

## Installation

```bash
# Klon projektet
git clone https://github.com/anderschristiansen/revai.git
cd revai

# Installer dependencies
npm install

# Konfigurer miljøvariabler
cp .env.local.example .env.local
# Udfyld .env.local med dine egne værdier

# Start udviklings-serveren
npm run dev
```

## Brug

1. Opret en ny review-session
2. Upload artikler i .txt format
3. Definer inklusionskriterier
4. Brug AI til at screene artikler
5. Gennemgå artikler og tag beslutninger
6. Spor dit fremskridt gennem visualiseringer

## Licens

Dette projekt er udgivet under MIT-licensen.
