# 🚀 Guide de mise en place CI/CD (GitHub Actions)

Ce guide explique comment configurer votre dépôt GitHub pour déployer automatiquement votre backend sur DigitalOcean à chaque modification.

## 1. Initialiser le Dépôt Git (Localement)

Si ce n'est pas déjà fait :

```bash
cd backend
git init
git add .
git commit -m "Initial commit w/ CI pipeline"
```

## 2. Créer le Dépôt sur GitHub

1.  Allez sur [GitHub.com](https://github.com) et créez un **nouveau repository** (ex: `bafoka-backend`).
2.  **Important** : Cochez "Private" si vous ne voulez pas exposer votre code.
3.  Liez votre repo local au distant :

```bash
git branch -M main
git remote add origin https://github.com/VOTRE_USERNAME/bafoka-backend.git
git push -u origin main
```

## 3. Configurer les Secrets sur GitHub

Le pipeline a besoin de se connecter à votre serveur DigitalOcean. Pour cela, nous allons stocker vos identifiants de manière sécurisée.

1.  Allez dans votre repo GitHub > **Settings** > **Secrets and variables** > **Actions**.
2.  Cliquez sur **New repository secret**.
3.  Ajoutez les secrets suivants :

| Nom du Secret | Valeur à mettre |
|---------------|-----------------|
| `DO_HOST` | L'adresse IP de votre Droplet (ex: `164.x.x.x`) |
| `DO_USER` | `root` (ou votre user sudo) |
| `DO_KEY` | Le contenu de votre clé privée SSH (`id_rsa`).<br>⚠️ Copiez TOUT le fichier, de `-----BEGIN...` à `...END-----`. |

> **Note** : Vous n'avez PAS besoin de créer `GITHUB_TOKEN`, il est géré automatiquement.

## 4. Préparer le Serveur (DigitalOcean)

Connectez-vous à votre serveur une fois manuellement pour préparer le fichier d'environnement :

```bash
ssh root@votre_ip
```

Ensuite, sur le serveur :

1.  Créez le dossier (s'il n'existe pas) :
    ```bash
    mkdir -p /root/bafoka-backend
    ```

2.  Créez le fichier `.env.production` avec vos vraies valeurs de prod (clés privées, etc.) :
    ```bash
    nano /root/bafoka-backend/.env.production
    ```
    *(Collez-y le contenu de votre fichier `.env.production` local, en mettant les vraies clés).*

## 5. C'est tout !

Dès que vous ferez un prochain `git push`, l'onglet **Actions** de votre repo GitHub s'animera.
- Il va construire l'image Docker.
- Il va la pousser sur le registre GitHub.
- Il va se connecter à votre serveur et mettre à jour l'application.
