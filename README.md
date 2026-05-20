<h1 align="center">
  <img src="assets/iconblack2.png" alt="Factarlou Logo" width="120" height="120"><br/>
  Factarlou
</h1>

<p align="center">
  <strong>L'Excellence de la Gestion Fiscale et Commerciale en Tunisie</strong><br/>
  Une application de bureau haute performance, confidentielle et sécurisée pour entrepreneurs et PME.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-3.1.0-blue?style=for-the-badge" alt="Version"/>
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey?style=for-the-badge" alt="Platform"/>
  <img src="https://img.shields.io/badge/built%20with-Electron-47848F?style=for-the-badge&logo=electron" alt="Electron"/>
  <img src="https://img.shields.io/badge/license-MIT-green?style=for-the-badge" alt="License"/>
</p>

---

## À propos

**Factarlou** est bien plus qu'un simple logiciel de facturation. C'est un écosystème complet de gestion conçu spécifiquement pour le cadre légal et fiscal **Tunisien**. Entièrement **Offline-First**, il garantit que vos données financières sensibles restent exclusivement sur votre machine, sans aucun passage par le cloud.

De la génération de factures conformes à l'exportation XML pour la plateforme **TEJ**, en passant par un **Point de Vente (POS)** complet, Factarlou automatise vos processus tout en assurant une précision chirurgicale (3 décimales).

---

## What's New in v3.1.0

### Auto-Updater Reliability

- **macOS DMG Cache Path Fix**: The post-download DMG scanning previously looked in `~/Library/Application Support/Factarlou/pending/` but `electron-updater` stores downloads in the system temp directory. Now correctly scans temp by modification time with application name filtering.
- **False-Positive Update Toast Fix**: `manualCheckUpdate()` now compares `currentVersion` vs `latestVersion` before showing "Mise à jour trouvée". No more false "update found" messages when already up-to-date.
- **Visible Error Toasts**: Update failures (network, GitHub downtime) are now shown as visible error toasts instead of being silently logged to console.
- **macOS Dock Progress Bar**: Download progress now appears as a progress circle on the macOS dock icon (in addition to the existing Windows taskbar support).
- **Destroyed Window Guard**: Added `!mainWindow.isDestroyed()` safety checks before all window/dock operations to prevent rare race condition crashes.

---

## Fonctionnalités Complètes

### 🏪 Point de Vente (POS / Caisse Enregistreuse)

Interface de caisse complète adaptée aux commerces et marchés :
- **Interface Plein Écran** : Grille produits avec filtres par catégorie, saisie code-barres/recherche unifiée (`F2`)
- **Panneau Panier** (380px fixe) : Quantité +/−, modification rapide, remise par ligne (%)
- **Optimisé Tactile** : Zones ≥44px, retour visuel `:active`, `touch-action: manipulation`
- **Modes de Prix** : Affichage HT/TTC (`F3`) avec badge bleu "TTC"
- **Top Ventes** : 10 produits les plus vendus aujourd'hui en ajout rapide
- **Favoris** (☆/★) : Sauvegardés dans localStorage, filtrables (`F6`)
- **Création Produit Rapide** (`F7`)
- **Override Prix** : Double-clic sur le total d'une ligne pour modifier le prix unitaire
- **Mise en Attente** : Pause/reprise de panier
- **Brouillons Multiples** : Sauvegarde/charge/supprime des paniers nommés
- **Paiement** : 4 moyens (Espèces, Carte, Mobile Money, Chèque). Calcul de monnaie
- **Split Tender** : Répartition sur plusieurs moyens de paiement
- **Acompte** : Paiement partiel avec solde suivi
- **Recherche Client CRM** : Autocomplétion avec points de fidélité
- **Fidélité** : 1pt/10 TND d'achat, affiché sur le ticket
- **Multi-Caissier** : Nom de l'opérateur sur le ticket
- **Sessions de Caisse** : Ouverture/clôture, écart de caisse détecté
- **Rapport X** (`F5`) : Résumé mi-journée sans fermeture
- **Rapport Z** : Rapport fin de journée, impression thermique 80mm
- **Mouvements de Caisse** (`F8`) : Apports/retraits en session
- **Ventes du Jour** (`F4`) : Historique complet avec remboursement
- **Stock** : Suivi optionnel, déduction auto, alerte stock bas
- **Ticket** : Style thermique 80mm, remises, éclatement paiements, pied personnalisable
- **Raccourcis** : `F1` plein écran, `F2` scan, `F3` TTC, `F4` ventes, `F5` X, `F6` favoris, `F7` produit, `F8` caisse
- **Intégration** : Ventes enregistrées comme documents `facture` (`is_pos=1`)

### 📄 Moteur de Documents — 8 Types

- **Types** : Facture, Avoir (Note de Crédit), Devis, Bon de Commande, BL, BA, BS, BE
- **Pipeline** : Suivi Devis → Facture → BL avec référence automatique
- **BA → Dépense** : Conversion en un clic
- **Numérotation Intelligente** : Compteur consommé uniquement à la sauvegarde. Saisie manuelle possible
- **4 Thèmes PDF** : Classique, Moderne, Exécutif, Tunisien
- **Modèles de Documents** : Sauvegarde/réutilisation de formulaires
- **Enregistrer & Nouveau** : Sauvegarde et nouveau formulaire immédiat
- **Champs Personnalisés** : Paires clé/valeur (internes uniquement)
- **Notes Internes** : Notes privées invisibles sur le PDF
- **Glisser-Déposer** : Réorganisation des lignes avec renumérotation
- **Brouillon Auto.** : Sauvegarde localStorage toutes les 2s, restauration auto
- **Dates en Langage Naturel** : "aujourd'hui", "demain", "+30d", "fin de mois"
- **Duplication** et **Conversion** en un clic

### 🇹🇳 Conformité Fiscale Tunisienne

- **TVA** : 0%, 7%, 13%, 19% multi-taux sur un même document
- **Timbre Fiscal** : 1.000 TND automatique
- **FODEC**
- **Retenue à la Source** : Certificats à 0.5%, 1%, 1.5%, 5%, 10%, 15%
- **Export TEJ XML** : Fichiers réglementaires RS et e-Factures
- **Précision 3 décimales** (Millimes)
- **Convertisseur de Devises**

### 🧠 Scanner Intelligent (OCR IA)

- Import de photos/PDF de reçus → IA extrait fournisseur, date, montant TTC
- Bilingue : Français + Arabe (Tesseract.js)
- Texte → Montant : "deux cent dinars" → 200.000
- Cache worker persistant pour scans quasi-instantanés

### 🧰 Boîte à Outils Fiscale & Juridique

- **Calculatrices** : Pénalités de retard, simulateur IRPP, récapitulatif TVA
- **Générateurs** : Lettres de mise en demeure, modèles PV d'AG
- **Vérificateur MF** : Validation algorithmique du Matricule Fiscal
- **Recherche RNE** : Interrogation en direct du Registre National des Entreprises
- **RNE Auto.** : Coller un MF → remplissage automatique
- **Auto-Complétion Client** : Suggestions au MF/nom dès 2 caractères
- **Assistant Déclaration TVA** : Récapitulatif mensuel collectée/déductible
- **Rapport TVA Annuel** : Mois par mois avec totaux annuels
- **Compte de Résultat (P&L)** : Revenus vs dépenses, résultat net
- **Bilan Annuel** : Actifs vs passifs
- **Simulateur de Scénarios** : Comparaison "what-if" — type, TVA, remise, timbre. 3 colonnes côte-à-côte
- **Graphe Relationnel** : Algorithme Apriori — associations d'articles, risque de paiement, récurrence client

### 👥 Ressources Humaines & Paie

- **Employés** : Base de données avec contrats (CDI, CDD, CIVP)
- **Fiches de Paie** : Génération auto avec cotisations CNSS (@ 9.18%)
- **Générateur de Contrats** : Modèles professionnels tunisiens

### 📊 Tableau de Bord & Analytics

- Graphique d'évolution mensuelle revenus/dépenses (Canvas)
- Top 5 clients (barres horizontales)
- Liste des impayés
- Redimensionnement automatique (ResizeObserver)

### 🗒️ Notes & Productivité

- **Notes Adhésives** : Code couleur, épinglage, widget tableau de bord
- **Opérations par Lot** : Documents → supprimer/marquer payé/exporter PDF
- **Envoi par Lot** : Email groupé avec barre de progression
- **Modèles d'Email** : Sauvegarde/charge d'objet/corps
- **Factures Récurrentes** : Génération auto (cron 60min)
- **Fil d'Ariane** : Indicateur de page contextuel
- **Recherche Rapide** : Filtrage temps réel (documents, clients, services, dépenses)
- **Tri par Colonnes** : Clic sur en-tête avec ▲/▼
- **Pagination** : 50 docs/page
- **Import/Export CSV** : Clients et services
- **Import/Export Excel (XLSX)** : Documents, clients, services
- **Carte Client** : Leaflet/OpenStreetMap
- **Multi-Langue** : Français, English, العربية avec RTL

### ⚙️ Paramètres & Mon Entreprise

- **Paramètres redessinés** : Barre latérale verticale, 5 onglets (Général, Documents, Apparence, Sauvegarde, Automatisation), cartes améliorées avec infobulles
- **Mon Entreprise** : Design uniforme — cartes structurées, icône `building`, pills
- **Dossier PDF configurable**
- **Format des nombres** : Décimales (0-5), arrondi (half_up/ceil/floor)
- **Compteurs** : Préfixes personnalisables par type avec aperçu
- **Thèmes documents** : 4 préréglages + personnalisation complète avec aperçu
- **Sauvegarde** : Planifiée/manuelle/automatique après enregistrement. Inclut pièces jointes

### 🔒 Sécurité & Architecture

- **Offline-First** : Zéro dépendance cloud. Données en SQLite local (mode WAL)
- **Chiffrement** : bcryptjs (mots de passe), Electron safeStorage (identifiants SMTP)
- **Validation** : Tous les handlers IPC validés via `validate.js`
- **Suppressions en Cascade** : Clients → documents → paiements/retenues/récurrent
- **Migrations Sécurisées** : `CREATE → INSERT → RENAME` (pas de DROP TABLE)
- **Mise à Jour Auto.** : Intégration GitHub Releases. Windows auto-install, macOS copie DMG
- **Tray** : Accès rapide Nouvelle Facture, Nouveau Devis, Dashboard, Quitter
- **Persistance Fenêtre** : Position, taille, maximisé mémorisés
- **Journal d'Activité** : Audit trail dans l'interface
- **Raccourcis Clavier** : `Cmd/Ctrl+N` nouvelle facture, `Cmd/Ctrl+Shift+N` nouveau devis, `Cmd/Ctrl+F` recherche, `Cmd/Ctrl+S` sauvegarder, `Échap` fermer modale

### 🛠 Stack Technique

| Composant | Technologie |
|---|---|
| Runtime | Electron.js v28 (macOS, Windows, Linux) |
| Base de données | SQLite via `better-sqlite3` (WAL) |
| Moteur PDF | Offscreen BrowserWindow (A4 parfait) |
| OCR | Tesseract.js (Français + Arabe) |
| Style | CSS vanilla avec système de design premium |
| Icônes | Lucide SVG |
| Validation | `src/validate.js` |
| Math/TVA | `src/math-utils.js` |
| i18n | Moteur maison (Français, English, العربية) avec RTL |
| Data Mining | Algorithme Apriori en JS pur |
| Cartographie | Leaflet.js + OpenStreetMap |
| Graphiques | Canvas API vanilla (sans dépendance) |

---

## Installation & Déploiement

### Téléchargement
Retrouvez les installateurs pour votre système sur la page des [Releases](https://github.com/a32116150-ctrl/tuninvoice/releases).

### Développement Local
```bash
git clone https://github.com/a32116150-ctrl/tuninvoice.git
npm install
npm start          # Lancement en développement
npm run build:mac  # Build macOS (.dmg)
npm run build:win  # Build Windows (.exe)
```

---

<p align="center">
  Développé par <strong>Anoir Cherif</strong> en Tunisie 🇹🇳<br/>
  &copy; 2026 Factarlou. Tous droits réservés.
</p>
