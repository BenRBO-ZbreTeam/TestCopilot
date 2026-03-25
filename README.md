# Stock Logistique — 4 Restaurants

Application web de gestion de stock pour Monsieur MOUETTE, GIGIO, TIGER Club et CHEZ HENRI.

## Fonctionnalités

- **Scanner de codes-barres EAN** — via caméra (mobile, tablette, PC)
- **Gestion entrées/sorties** — scan + saisie de quantité
- **Stock en temps réel** — dashboard avec alertes visuelles
- **Historique des mouvements** — filtres par type, restaurant, date
- **Fiches produits** — création manuelle ou auto-complétée via Open Food Facts
- **Alertes email** — notification quand le stock passe sous un seuil configurable
- **Design minimaliste** — noir & blanc, responsive mobile/tablette/PC

## Stack technique

| Composant | Technologie |
|-----------|------------|
| Backend | Node.js + Express |
| Base de données | SQLite3 (better-sqlite3) |
| Frontend | React 18 + Vite |
| Scanner | html5-qrcode |
| Emails | Nodemailer |

## Installation

### 1. Installer les dépendances

```bash
npm run install:all
```

### 2. Configurer l'environnement

```bash
cp backend/.env.example backend/.env
# Éditer backend/.env avec vos paramètres SMTP
```

### 3. Développement

```bash
npm run dev
# Backend : http://localhost:3001
# Frontend : http://localhost:5173
```

### 4. Production

```bash
npm run build   # Build le frontend
npm start       # Démarre le backend qui sert aussi le frontend
# Application disponible sur http://localhost:3001
```

## Configuration email (alertes)

Dans `backend/.env` :

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre@gmail.com
SMTP_PASS=votre_mot_de_passe_application
EMAIL_FROM="Stock Logistique" <votre@gmail.com>
```

Pour Gmail, utilisez un **mot de passe d'application** (pas votre mot de passe principal).

## Utilisation sur mobile

L'application est optimisée pour l'usage mobile :
- Navigation bas de page
- Scanner caméra plein écran avec lampe torche
- Boutons larges, saisie tactile
- Retour haptique lors d'un scan

## Restaurants configurés

- Monsieur MOUETTE
- GIGIO
- TIGER Club
- CHEZ HENRI
