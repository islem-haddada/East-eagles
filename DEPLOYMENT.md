# 🚀 Guide de Déploiement - East Eagles

## Option 1: Railway (Recommandé - Gratuit pour commencer)

### Étape 1: Déployer la Base de Données PostgreSQL

1. Allez sur [railway.app](https://railway.app) et créez un compte
2. Cliquez sur **"New Project"** → **"Provision PostgreSQL"**
3. Une fois créé, cliquez sur PostgreSQL et copiez les variables:
   - `PGHOST` → C'est votre `DB_HOST`
   - `PGPORT` → C'est votre `DB_PORT`
   - `PGUSER` → C'est votre `DB_USER`
   - `PGPASSWORD` → C'est votre `DB_PASSWORD`
   - `PGDATABASE` → C'est votre `DB_NAME`

### Étape 2: Déployer le Backend Go

1. Dans le même projet Railway, cliquez **"New"** → **"GitHub Repo"**
2. Sélectionnez votre repo `East-eagles`
3. Railway va détecter le Dockerfile
4. Configurez le **Root Directory**: `Backend/project`
5. Ajoutez les **Variables d'environnement**:
   ```
   DB_HOST=<valeur de PGHOST>
   DB_PORT=5432
   DB_USER=postgres
   DB_PASSWORD=<valeur de PGPASSWORD>
   DB_NAME=railway
   JWT_SECRET=<générez une clé secrète longue>
   FRONTEND_URL=https://votre-frontend.vercel.app
   ```
6. Cliquez **Deploy**
7. Une fois déployé, copiez l'URL du backend (ex: `https://east-eagles-backend.railway.app`)

### Étape 3: Déployer le Frontend sur Vercel

1. Allez sur [vercel.com](https://vercel.com) et connectez-vous avec GitHub
2. Cliquez **"Import Project"** → Sélectionnez `East-eagles`
3. Configurez:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Create React App
4. Ajoutez la **Variable d'environnement**:
   ```
   REACT_APP_API_URL=https://votre-backend.railway.app/api
   ```
5. Cliquez **Deploy**

---

## Option 2: Render.com (Alternative gratuite)

### Backend sur Render

1. Allez sur [render.com](https://render.com)
2. **New** → **Web Service**
3. Connectez votre GitHub repo
4. Configurez:
   - **Root Directory**: `Backend/project`
   - **Build Command**: `go build -o server ./cmd/server`
   - **Start Command**: `./server`
5. Ajoutez les variables d'environnement (comme Railway)

### Base de données sur Render

1. **New** → **PostgreSQL**
2. Copiez les credentials et utilisez-les dans le backend

---

## Option 3: DigitalOcean App Platform

1. Créez un compte sur [digitalocean.com](https://digitalocean.com)
2. Apps → Create App → GitHub
3. Suivez l'assistant de configuration

---

## 🔧 Après le Déploiement

### Initialiser la Base de Données

Connectez-vous à votre base de données et exécutez les migrations:

```sql
-- Exécutez le contenu de vos fichiers migrations/*.sql
```

### Créer un Admin

```sql
INSERT INTO users (email, password_hash, role, first_name, last_name, is_active)
VALUES (
  'admin@easteagles.com',
  '$2a$12$WWAU5H5/90rm37VtEHAFKu8ibIbnYTM9WjhnlKdYB0x5byKqFwKdu',
  'admin',
  'Admin',
  'User',
  true
);
```
Mot de passe: `admin123` (changez-le après la première connexion)

---

## 📝 Variables d'environnement Requises

### Backend
| Variable | Description | Exemple |
|----------|-------------|---------|
| `DB_HOST` | Hôte PostgreSQL | `db.railway.app` |
| `DB_PORT` | Port PostgreSQL | `5432` |
| `DB_USER` | Utilisateur DB | `postgres` |
| `DB_PASSWORD` | Mot de passe DB | `secret123` |
| `DB_NAME` | Nom de la base | `east_eagles` |
| `JWT_SECRET` | Clé secrète JWT | `your-32-char-secret` |
| `PORT` | Port du serveur | `8080` |
| `FRONTEND_URL` | URL du frontend | `https://app.vercel.app` |

### Frontend
| Variable | Description | Exemple |
|----------|-------------|---------|
| `REACT_APP_API_URL` | URL de l'API backend | `https://api.railway.app/api` |

---

## 🔒 Sécurité

1. **Changez le JWT_SECRET** en production
2. **Changez le mot de passe admin** après la première connexion
3. **Activez HTTPS** (automatique sur Railway/Vercel/Render)
4. **Configurez CORS** correctement avec FRONTEND_URL

---

## 🆘 Problèmes Courants

### CORS Error
- Vérifiez que `FRONTEND_URL` correspond exactement à l'URL de votre frontend

### Database Connection Failed
- Vérifiez les credentials de la base de données
- Assurez-vous que la base est accessible depuis le backend

### 404 sur les routes React
- Le fichier `nginx.conf` doit être configuré pour React Router
