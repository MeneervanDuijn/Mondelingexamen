# Cloudflare Pages & GitHub Actions Deployment Guide

Dit document legt uit hoe je deze **Mondeling Trainer Maatschappijleer** applicatie kunt bouwen en deployen naar **Cloudflare Pages** met automatische CI/CD via **GitHub Actions**, inclusief een serverless database met **Cloudflare D1**.

---

## 🚀 Snelstart: Deployen naar Cloudflare Pages

### Stap 1: GitHub Repository aanmaken en code pushen
1. Maak een nieuwe (private of public) repository aan op GitHub.
2. Push deze codebase naar je GitHub repository:
   ```bash
   git init
   git remote add origin git@github.com:GEBRUIKERSNAAM/REPOSITORINAAM.git
   git branch -M main
   git add .
   git commit -m "Initial commit met Cloudflare Pages & D1 support"
   git push -u origin main
   ```

### Stap 2: Cloudflare API Token & Account ID ophalen
1. Log in op je **Cloudflare Dashboard**.
2. Ga rechtsboven naar **My Profile** > **API Tokens**.
3. Klik op **Create Token**, kies het sjabloon **Cloudflare Pages** (of maak een custom token met `Pages: Edit` machtiging).
4. Kopieer de gegenereerde API Token.
5. Je **Account ID** vind je aan de rechterkant van de hoofdpagina van je Cloudflare Dashboard (of in de URL na `dash.cloudflare.com/...`).

### Stap 3: GitHub Secrets instellen
Ga in je GitHub repository naar **Settings** > **Secrets and variables** > **Actions** en voeg de volgende secrets toe:

| Secret Naam | Waarde / Uitleg |
|---|---|
| `CLOUDFLARE_API_TOKEN` | De API Token die je bij Stap 2 hebt gemaakt. |
| `CLOUDFLARE_ACCOUNT_ID` | Je Cloudflare Account ID uit Stap 2. |
| `GEMINI_API_KEY` | Je Google Gemini API Key voor de mondelinge trainer. |

Zodra je deze secrets hebt toegevoegd en code pusht naar de `main` of `master` branch, zal de GitHub Action (`.github/workflows/deploy.yml`) de applicatie automatisch bouwen en deployen!

---

## 🗄️ Database instellen (Cloudflare D1)

De applicatie slaat resultaten op via een API. Lokaal gebruikt de app SQLite (`better-sqlite3`). Op Cloudflare Pages draait de app serverless en maken we gebruik van **Cloudflare D1** (serverless SQL database).

### Stap 1: Maak een D1 Database aan in Cloudflare
1. Ga in het Cloudflare Dashboard naar **Workers & Pages** > **D1**.
2. Klik op **Create database** > **Dashboard**.
3. Geef de database een naam, bijvoorbeeld: `mondeling-trainer-db`.
4. Klik op **Create**.

### Stap 2: Initialiseer het database schema
Gebruik het meegeleverde `schema.sql` bestand om de tabel aan te maken:
1. Klik binnen de database-instellingen in Cloudflare op het tabblad **Console**.
2. Of voer Wrangler uit via je terminal om het schema te uploaden:
   ```bash
   npx wrangler d1 execute mondeling-trainer-db --remote --file=./schema.sql
   ```

### Stap 3: Koppel D1 aan je Cloudflare Pages project
1. Ga in Cloudflare naar **Workers & Pages** > selecteer je Pages Project (**mondeling-trainer**).
2. Ga naar **Settings** > **Functions** > **D1 database bindings**.
3. Klik op **Add binding**.
4. Stel de **Variable name** exact in op: `DB`.
5. Selecteer je gemaakte D1 database (`mondeling-trainer-db`) in het dropdown-menu.
6. Klik op **Save**.

Nu zullen de resultaten van examens automatisch veilig in Cloudflare D1 worden opgeslagen zodra studenten op "Resultaat opslaan" klikken!

---

## 🔑 Gemini API Key configureren op Cloudflare

Omdat de spraak- en tekstgeneratie server-side of client-side wordt aangeroepen, moet de `GEMINI_API_KEY` ook geconfigureerd zijn in je Cloudflare Pages omgeving:

1. Ga in je Pages project naar **Settings** > **Environment variables**.
2. Klik op **Add variables**.
3. Voeg een variabele toe:
   * **Variable name**: `GEMINI_API_KEY`
   * **Value**: *[Je Google Gemini API Key]*
4. Zorg ervoor dat deze is toegevoegd aan zowel de **Production** als **Preview** omgeving.
5. Klik op **Save**.

---

## 💡 Hoe het werkt in deze codebase

1. **Frontend Fallback**: Mocht de verbinding met de online database mislukken (bijvoorbeeld als de app offline is of D1 nog niet is gekoppeld), dan bewaart `src/App.tsx` de resultaten automatisch veilig in de `localStorage` van de browser van de gebruiker!
2. **Pages Functions**: De map `/functions` bevat de serverless API endpoints `/api/save-result` en `/api/results`. Cloudflare herkent deze map automatisch en compileert ze naar snelle, schaalbare serverless routes die direct met je Cloudflare D1 database praten.
