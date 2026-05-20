# Factarlou — Full Documentation

Bienvenue dans la documentation officielle de **Factarlou**, l'application de bureau intelligente de facturation et gestion d'entreprise conçue pour le marché Tunisien.

---

## 1. Aperçu Général

**Factarlou** est une application de bureau **Offline-First** haute performance construite avec **Electron.js**. Elle gère l'intégralité du cycle de vie financier des freelances, PME et startups en Tunisie — de la génération de devis au suivi des dépenses, en passant par la conformité fiscale, la paie, et un **Point de Vente (POS)** complet — le tout en garantissant 100% de confidentialité des données. Aucun cloud, aucune télémétrie.

---

## 2. Fonctionnalités Détaillées

### 🏪 Point de Vente (POS / Caisse Enregistreuse)

Interface de caisse complète adaptée aux commerces et marchés :

**Interface & Navigation**
- Plein écran accessible via `F1`
- Grille produits en auto-fill avec filtres par catégorie (pills)
- Saisie code-barres/recherche texte unifiée (`F2` focus)
- Panneau panier fixe 380px sur la droite
- Barre supérieure avec actions rapides (TTC, Z-report, ventes du jour, réimpression)

**Produits**
- Mode TTC : bascule HT/TTC (`F3`), badge bleu "TTC"
- Top Ventes : 10 produits les plus vendus aujourd'hui en un tap
- Favoris (☆/★) : sauvegardés localStorage, filtrables (`F6`)
- Images produit : vignettes sur les fiches
- Création produit rapide depuis le POS (`F7`)
- Gestion de stock : suivi optionnel, déduction auto, alerte stock bas

**Panier**
- Quantité +/− (zones 40x40px tactiles)
- Modification rapide de quantité (double-clic)
- Remise par ligne (0–100%), TVA recalculée
- Override prix (double-clic sur total ligne)
- Mise en attente / reprise
- Brouillons multiples (sauvegarde/charge/supprime)
- Note sur le ticket

**Paiement**
- 4 moyens : Espèces, Carte, Mobile Money, Chèque
- Calcul de la monnaie
- Split Tender : répartition sur plusieurs moyens
- Acompte : paiement partiel avec solde suivi
- Recherche client CRM avec points de fidélité

**Fidélité & Multi-Caissier**
- 1 point par 10 TND d'achat (localStorage)
- Points affichés sur le ticket et dans une modale dédiée
- Saisie du nom de l'opérateur, imprimé sur le ticket

**Sessions de Caisse**
- Ouverture avec fond de caisse
- Mouvements de caisse (apports/retraits) (`F8`)
- Rapport X : résumé mi-journée sans fermeture (`F5`)
- Rapport Z : rapport fin de journée imprimable
- Détection d'écart de caisse à la clôture
- Ventes du jour : historique avec remboursement (`F4`)

**Ticket de Caisse**
- Style thermique 80mm
- Articles, remises, éclatement des paiements
- Pied de ticket personnalisable
- Note sur le ticket
- Points de fidélité
- Nom de l'opérateur
- Réimpression du dernier ticket

**Raccourcis Clavier**
- `F1` : Plein écran
- `F2` : Focus recherche/scan
- `F3` : Bascule HT/TTC
- `F4` : Ventes du jour
- `F5` : Rapport X
- `F6` : Favoris
- `F7` : Nouveau produit
- `F8` : Mouvement de caisse

### 📄 Moteur de Documents — 8 Types Commerciaux

**Types de Documents**
- **Facture** : Document commercial principal avec TVA, timbre, échéance
- **Avoir** : Note de crédit avec logique de revenu négatif
- **Devis** : Devis convertible en facture ou BL
- **Bon de Commande**
- **BL** : Bon de Livraison
- **BA** : Bon d'Achat (convertible en dépense)
- **BS** : Bon de Sortie
- **BE** : Bon d'Entrée

**Pipeline & Conversion**
- Suivi Devis → Facture → BL avec référence automatique
- Colonne "Pipeline" dans la liste des documents
- BA → Dépense en un clic
- Duplication de document

**Numérotation Intelligente**
- Compteur consommé uniquement à la sauvegarde réelle (pas à l'ouverture)
- Aperçu sans consommation via `peekNextDocNumber()`
- Saisie manuelle possible, le système respecte la modification sans avancer le compteur
- Préfixes personnalisables par type et par année
- Réinitialisation du compteur disponible

**Gestion des Articles**
- Description, quantité, prix, TVA (multi-taux)
- Remise proportionnelle
- Glisser-déposer pour réorganiser les lignes
- Renumérotation automatique après réorganisation
- Sauvegarde automatique du brouillon toutes les 2s

**Personnalisation**
- 4 thèmes PDF : Classique, Moderne, Exécutif, Tunisien
- Thème personnalisé complet (couleurs, polices, layout)
- Logo, cachet, signature, QR code activables
- Champs personnalisés (paires clé/valeur, usage interne)
- Notes internes (invisibles sur le PDF)

**Productivité**
- Modèles de documents : sauvegarde/charge/supprime
- Enregistrer & Nouveau
- Dates en langage naturel : "aujourd'hui", "demain", "+30d", "fin de mois"
- Auto-complétion client au MF/nom

### 🇹🇳 Conformité Fiscale Tunisienne

**TVA**
- Taux : 0%, 7%, 13%, 19%
- Multi-taux sur un même document
- Calcul automatique TVA collectée/déductible
- Déclaration TVA mensuelle avec solde
- Rapport TVA annuel mois par mois

**Timbre Fiscal**
- 1.000 TND appliqué automatiquement
- Configurable

**Retenue à la Source**
- Certificats officiels aux taux : 0.5%, 1%, 1.5%, 5%, 10%, 15%
- Génération PDF des certificats
- Export Excel des retenues

**Export Réglementaire**
- TEJ XML : fichiers pour Retenue à la Source et Factures Électroniques
- Précision 3 décimales (Millimes) sur tous les calculs
- Conformité aux normes comptables tunisiennes

### 🧠 Scanner Intelligent (OCR IA)

- Import de photos ou PDF de reçus
- Extraction automatique : fournisseur, date, montant TTC
- Bilingue : Français et Arabe (Tesseract.js)
- Texte → Montant : détection des montants écrits en toutes lettres
- Cache worker persistant pour analyses quasi-instantanées
- Gestion des pièces jointes numériques

### 🧰 Boîte à Outils Fiscale & Juridique

**Calculatrices**
- Pénalités de retard (système spontané/rectifié)
- Simulateur d'impôt IRPP
- Récapitulatif de TVA
- Convertisseur de devises

**Générateurs**
- Lettres de relance (mise en demeure)
- PV d'assemblée générale (modèles types)

**Vérification & Recherche**
- Vérificateur MF : validation algorithmique du Matricule Fiscal
- Recherche RNE en direct : nom officiel, statut (Actif/Radié), forme juridique, adresse
- Coller MF → RNE : remplissage automatique
- Auto-complétion client au MF/nom

**Rapports Financiers**
- Compte de Résultat (P&L) : revenus vs dépenses, résultat net
- Bilan Annuel : actifs (créances + encaissements) vs passifs
- TVA Annuelle : mois par mois avec totaux

**Analyse Avancée**
- Simulateur de Scénarios : comparaison "what-if" original vs simulé (3 colonnes)
- Modification en temps réel : type document, TVA, remise, timbre
- Application du scénario en un clic
- Graphe Relationnel (Apriori) :
  - Associations d'articles (cross-selling)
  - Risque de paiement par article (code couleur)
  - Récurrence client (fréquence en jours)
- Seuils ajustables (support 2-15%, confiance 20-70%)
- Zéro dépendance externe, s'exécute entièrement dans le renderer

### 👥 Ressources Humaines & Paie

- Base de données employés (CDI, CDD, CIVP)
- Suivi des contrats avec dates et statut
- Génération automatique de fiches de paie
- Calcul des cotisations CNSS (@ 9.18%)
- Aperçu et impression PDF
- Générateur de contrats de travail

### 📊 Tableau de Bord & Analytics

- Graphique d'évolution mensuelle revenus/dépenses (Canvas API)
- Top 5 clients (barres horizontales)
- Liste des impayés avec priorité
- Ajustement automatique au redimensionnement
- Avoirs intégrés comme revenu négatif
- Indicateurs visuels : Impayé, Partiellement Payé, Payé

### 🗒️ Notes & Productivité

**Notes Adhésives**
- CRUD complet avec couleurs et épinglage
- Widget tableau de bord (4 dernières notes)
- Stockage SQLite

**Opérations par Lot**
- Sélection multiple avec cases à cocher
- Actions groupées : supprimer, marquer payé, exporter PDF
- Envoi par email groupé avec barre de progression
- Modèles d'email sauvegardables

**Factures Récurrentes**
- CRUD complet avec interface utilisateur
- Génération automatique via cron (toutes les 60min)
- Fréquences : hebdomadaire, mensuelle, trimestrielle, annuelle
- Templates d'articles en JSON

**Fonctionnalités de Recherche**
- Recherche sur toutes les pages (documents, clients, services, dépenses)
- Recherche globale depuis la barre supérieure
- Filtrage temps réel

**Interface**
- Pagination (50 docs/page)
- Tri par colonnes avec indicateurs ▲/▼
- Fil d'Ariane contextuel

- Persistance du thème (clair/sombre)
- Persistance de la dernière page et du dernier type de document

### ⚙️ Paramètres

**Interface Redessinée** (v3.0.0)
- Barre latérale verticale avec 5 onglets
- Persistance de l'onglet actif (localStorage)
- Cartes structurées avec en-tête + description + barre de sauvegarde
- Infobulles contextuelles avec icônes Lucide

**Onglets**
1. **Général** : Format des nombres (décimales, arrondi), dossier PDF
2. **Documents** : Préfixes par type, aperçu du compteur, réinitialisation
3. **Apparence** : 4 thèmes prédéfinis + constructeur personnalisé, aperçu en direct, mode clair/sombre
4. **Sauvegarde** : Planification, création manuelle, rapport, liste des sauvegardes, restauration
5. **Automatisation** : Factures récurrentes (CRUD)

### 🏢 Mon Entreprise

- Design uniforme avec les Paramètres (v3.0.0)
- Cartes structurées (en-tête + description + barre de sauvegarde)
- Infobulles contextuelles
- Icône Lucide `building`
- Libellés en forme de pills
- Logo, cachet, signature avec aperçu
- QR Code, accent color

### 🔒 Sécurité

- **Offline-First** : Aucune donnée sur le cloud
- **Chiffrement** : bcryptjs pour mots de passe, Electron safeStorage pour SMTP
- **Validation** : `validate.js` pour tous les handlers IPC
- **Suppressions en Cascade** : Nettoyage automatique des dépendances
- **Migrations Sécurisées** : Pattern `CREATE → INSERT → RENAME`
- **Aucune Télémétrie** : Pas de tracking ni d'analytics

### 🛠 Stack Technique

| Composant | Technologie |
|---|---|
| Runtime | Electron.js v28 |
| Base de données | better-sqlite3 (mode WAL) |
| Moteur PDF | Offscreen BrowserWindow |
| OCR | Tesseract.js |
| Style | CSS vanilla (système de design) |
| Icônes | Lucide SVG |
| Validation | `src/validate.js` |
| Math/TVA | `src/math-utils.js` |
| i18n | Français uniquement |
| Data Mining | Apriori JS pur (`apriori.js`) |
| Cartographie | Leaflet.js + OpenStreetMap |
| Graphiques | Canvas API vanilla |
| Mise à jour | electron-updater (GitHub Releases) |
| Export | XLSX, CSV, PDF, TEJ XML |

---

## 3. Installation

```bash
# Cloner le dépôt
git clone https://github.com/a32116150-ctrl/tuninvoice.git
cd tuninvoice

# Installer les dépendances
npm install

# Lancer en développement
npm start

# Construire les binaires
npm run build:mac   # macOS (.dmg)
npm run build:win   # Windows (.exe/.nsis)
```

---

## 4. Mise à Jour Automatique

Factarlou utilise `electron-updater` avec GitHub Releases.

**Déclenchement** : Une vérification est effectuée 3 secondes après le démarrage, puis à chaque clic sur "Vérifier les mises à jour".

**Windows** :
- Téléchargement automatique en arrière-plan
- Barre de progression dans la barre des tâches
- Dialogue "Redémarrer maintenant / Plus tard"
- `quitAndInstall` installe silencieusement et relance

**macOS** :
- Téléchargement automatique dans le dossier temporaire système
- Copie du fichier DMG dans Téléchargements
- Instructions claires : ouvrir le DMG, glisser vers Applications, remplacer
- Barre de progression dans le dock
- Fallback : ouverture du site web si DMG introuvable

**v3.1.0** : Correction du chemin de cache macOS, toast d'erreur visible, comparaison de versions fiable.

---

## 5. Développement

### Structure du Projet
```
tuniinvoice-desktop/
  src/
    main.js                    # Processus principal (IPC, PDF, updater)
    preload.js                 # Bridge contextBridge
    validate.js                # Validation des données
    math-utils.js              # Utilitaires TVA/calculs
    backup-scheduler.js        # Sauvegarde planifiée
    database/
      db.js                    # Schéma et requêtes SQLite
    exporters/
      csv-exporter.js          # Export CSV
      excel-exporter.js        # Export Excel
    renderer/
      index.html               # Interface HTML
      styles.css               # Système de design CSS
      app.js                   # Point d'entrée (2 lignes)
      app-core.js              # Utilitaires partagés
      app-auth.js              # Authentification & navigation
      app-features.js          # Toutes les fonctionnalités
      apriori.js               # Algorithme Apriori
      i18n.js                  # Moteur de traduction
      locales/                 # Fichiers de traduction (fr)
      builders/
        invoice-builder.js     # Constructeur HTML factures
      retenue-builder.js       # Constructeur HTML retenues/paie
      contract-builder.js      # Constructeur HTML contrats
      images/                  # Ressources graphiques
      leaflet.js / leaflet.css # Cartographie
      lucide.min.js            # Icônes Lucide
  assets/
    iconblack2.png             # Icône de l'application
  .github/workflows/
    deploy.yml                 # CI/CD : build + release sur tag v*
  package.json                 # Configuration et dépendances
```

### Scripts
```bash
npm start              # Lancer en développement
npm run build:mac      # Build macOS
npm run build:win      # Build Windows
npm run lint           # ESLint
npm run lint:fix       # ESLint auto-fix
npm run format         # Prettier
npm run format:check   # Vérification Prettier
```

---

<p align="center">
  <strong>Factarlou</strong> — L'avenir de la gestion d'entreprise tunisienne.<br/>
  <em>Construit pour la rapidité. Construit pour la confidentialité. Construit pour vous.</em>
</p>
