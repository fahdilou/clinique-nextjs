# Gestion Clinique — Next.js + Prisma + Supabase 

Application modernisée de gestion de clinique. Remplace l'ancien projet Streamlit (Python) par une stack full-stack TypeScript.

## Stack

- **Framework** : Next.js 15 (App Router) + React 19 + TypeScript
- **Base de données** : Supabase Postgres (existante, non modifiée)
- **ORM** : Prisma
- **Auth** : Supabase Auth (email + mot de passe)
- **UI** : Tailwind CSS + composants shadcn-style + Lucide icons
- **Déploiement** : Vercel

## Modules

| Module | Route | Description |
|---|---|---|
| Tableau de bord | `/dashboard` | KPI globaux (factures, encaissements, dépenses, alertes) |
| Factures | `/factures` | Registre factures assurance, encaissements, filtres |
| Assurances | `/assurances` | CRUD compagnies partenaires |
| Dépenses | `/depenses` | Suivi dépenses par catégorie |
| Stock | `/stock` | Produits, mouvements (entrée/sortie), alertes seuil |
| Utilisateurs | `/utilisateurs` | Admin : comptes, rôles, permissions |

## Prérequis

- Node.js ≥ 20
- Un projet Supabase avec les 6 tables existantes : `utilisateurs`, `factures`, `assurances`, `produits`, `mouvements_stock`, `depenses`

## Installation locale

```bash
cd clinique-nextjs
npm install
cp .env.example .env
# Remplir .env avec les valeurs Supabase (voir ci-dessous)
npx prisma generate
npm run dev
```

Ouvrir http://localhost:3000

## Configuration `.env`

Récupère toutes les valeurs dans **Supabase → Project Settings** :

```env
# Settings → API
NEXT_PUBLIC_SUPABASE_URL="https://xxxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGci..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGci..."   # ⚠️ SECRET — jamais exposé au navigateur

# Settings → Database → Connection string → URI
# Pooler (Transaction mode, port 6543) pour runtime
DATABASE_URL="postgresql://postgres.xxxxx:PASSWORD@aws-0-xxx.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Direct (port 5432) pour Prisma migrations
DIRECT_URL="postgresql://postgres.xxxxx:PASSWORD@aws-0-xxx.pooler.supabase.com:5432/postgres"
```

## Auth : première utilisation

Puisque l'ancienne base utilisait des mots de passe SHA256 maison, il faut **recréer les utilisateurs dans Supabase Auth**.

**Option A — Créer un admin manuellement** (rapide) :

1. Supabase → **Authentication → Users → Add user**
2. Renseigner email + mot de passe, cocher "Auto Confirm User"
3. Se connecter sur `/login`
4. Ensuite, dans un SQL editor Supabase, promouvoir en admin :
   ```sql
   UPDATE utilisateurs SET role='admin', permissions='["corriger_factures","exporter","gerer_assurances","gerer_depots","encaisser_virements","voir_finances","voir_analyses","gerer_utilisateurs","gerer_depenses"]' WHERE email='votre@email.com';
   ```
5. Depuis l'app, module **Utilisateurs**, tu peux créer les autres comptes qui seront synchronisés Auth + table `utilisateurs`.

**Option B — Migrer les emails existants** :
- Créer chaque compte dans Supabase Auth (l'app fera automatiquement le lien avec la ligne existante dans `utilisateurs` via l'email lors du premier login).

## Vérifier la synchronisation Prisma ↔ Supabase

Le schéma Prisma (`prisma/schema.prisma`) mappe **exactement** les tables existantes. Aucune migration à exécuter. Pour vérifier :

```bash
npx prisma db pull   # rapproche schema.prisma de la DB actuelle
npx prisma generate
```

Si `db pull` détecte des différences, adapter le schéma manuellement (ne pas modifier la base).

## Déploiement Vercel

1. Push le dossier `clinique-nextjs` vers GitHub
2. Sur [vercel.com/new](https://vercel.com/new), importer le repo, définir **Root Directory = `clinique-nextjs`**
3. Ajouter toutes les variables d'environnement du `.env`
4. Build command : `prisma generate && next build` (auto via `package.json`)
5. Deploy 🚀

Vercel détecte Next.js automatiquement. Le `postinstall` script régénère le client Prisma.

## Système de permissions

9 permissions granulaires stockées en JSON dans `utilisateurs.permissions` :

| Clé | Description |
|---|---|
| `corriger_factures` | Modifier / supprimer factures |
| `exporter` | Exports Excel/CSV/Word |
| `gerer_assurances` | CRUD compagnies |
| `gerer_depots` | Gérer dates de dépôt |
| `encaisser_virements` | Enregistrer paiements |
| `voir_finances` | Voir données financières |
| `voir_analyses` | Voir analyses/statistiques |
| `gerer_utilisateurs` | Admin utilisateurs |
| `gerer_depenses` | CRUD dépenses |

Rôles prédéfinis (`admin`, `directeur`, `comptable`, `assistant`, `caissier`) avec permissions par défaut — voir [src/lib/permissions.ts](src/lib/permissions.ts).

## Structure

```
clinique-nextjs/
├── prisma/schema.prisma          # modèles Prisma
├── src/
│   ├── app/
│   │   ├── (auth)/login/         # page de connexion
│   │   ├── (dashboard)/          # zone protégée
│   │   │   ├── layout.tsx        # sidebar + auth guard
│   │   │   ├── dashboard/        # accueil KPIs
│   │   │   ├── factures/
│   │   │   ├── assurances/
│   │   │   ├── depenses/
│   │   │   ├── stock/
│   │   │   └── utilisateurs/
│   │   └── layout.tsx            # root
│   ├── components/
│   │   ├── sidebar.tsx
│   │   └── ui/                   # boutons, cards, tables, etc.
│   ├── lib/
│   │   ├── actions/              # Server Actions (Prisma)
│   │   ├── supabase/             # clients Supabase
│   │   ├── auth.ts               # session + permissions
│   │   ├── permissions.ts
│   │   ├── prisma.ts
│   │   └── utils.ts
├── middleware.ts                 # protection routes + refresh session
├── package.json
├── tailwind.config.ts
└── .env.example
```

## Fonctionnalités à venir (roadmap)

Les fonctionnalités suivantes étaient présentes dans l'ancien projet Streamlit et peuvent être portées à la demande :
- Import CSV/Excel massif (factures, dépenses, produits)
- Exports PDF / Word (relances, analyses mensuelles)
- Graphiques Recharts (analyses par assurance, évolution mensuelle)
- Relances email/SMS aux assurances
- Corrections & validations groupées de factures

Signale les priorités et je les branche.
