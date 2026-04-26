<h1 align="center">
  <img src="assets/iconblack2.png" alt="Factarlou Logo" width="120" height="120"><br/>
  Factarlou
</h1>

<p align="center">
  <strong>L'Excellence de la Gestion Fiscale et Commerciale en Tunisie</strong><br/>
  Une application de bureau haute performance, confidentielle et sécurisée pour entrepreneurs et PME.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-2.6.2-blue?style=for-the-badge" alt="Version"/>
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey?style=for-the-badge" alt="Platform"/>
  <img src="https://img.shields.io/badge/built%20with-Electron-47848F?style=for-the-badge&logo=electron" alt="Electron"/>
  <img src="https://img.shields.io/badge/license-MIT-green?style=for-the-badge" alt="License"/>
</p>

---

## 📖 À propos

**Factarlou** est bien plus qu'un simple logiciel de facturation. C'est un écosystème complet de gestion conçu spécifiquement pour le cadre légal et fiscal **Tunisien**. Entièrement **Offline-First**, il garantit que vos données financières sensibles restent exclusivement sur votre machine, sans aucun passage par le cloud.

De la génération de factures conformes à l'exportation XML pour la plateforme **TEJ**, Factarlou automatise vos processus tout en assurant une précision chirurgicale (3 décimales).

---

## ✨ Fonctionnalités Majeures (v2.6.2)

### 🇹🇳 Conformité Fiscale Tunisienne
- **Export TEJ XML** : Génération de fichiers réglementaires pour la **Retenue à la Source (RS)** et les **Factures Électroniques**.
- **Certificats de Retenue** : Création instantanée des certificats officiels (DGF) avec taux paramétrables (0.5%, 1%, 1.5%, 5%, 10%, 15%).
- **Timbre Fiscal** : Gestion automatisée du timbre de 1.000 TND sur les factures TTC.
- **Précision Millimes** : Support complet des 3 décimales pour tous les calculs monétaires.

### 🧠 Scanner Intelligent (OCR AI)
- **Extraction Automatique** : Importez vos reçus (Photo/PDF) et laissez l'IA (Tesseract.js) extraire le fournisseur, la date et le montant.
- **Bilingue** : Compréhension native des documents en **Français** et en **Arabe**.
- **Text-to-Amount** : Conversion intelligente des montants écrits en toutes lettres.

### 🧰 Boîte à Outils Fiscale & Juridique
Une suite complète d'assistants pour vous simplifier la vie :
- **Calculatrices** : Pénalités de retard (système spontané/rectifié), simulateur d'impôt IRPP, récapitulatif de TVA.
- **Générateurs** : Lettres de relance (mise en demeure), PV d'assemblée générale (modèles types).
- **Vérificateur & Recherche RNE** : Validation algorithmique du Matricule Fiscal et **interrogation en direct** des registres publics du RNE Tunisie (Dénomination, Statut, Forme Juridique).
- **Ressources** : Calendrier fiscal tunisien et annuaire complet des Recettes des Finances.

### 👥 Ressources Humaines & Paie
- **Gestion du Personnel** : Base de données employés avec suivi des contrats (CDI, CDD, CIVP).
- **Bulletins de Paie** : Génération automatique de fiches de paie avec calcul des cotisations CNSS (@ 9.18%).

### 🎨 Branding & Design Premium
- **Personnalisation Totale** : Logo, Cachet, Signature, et QR Code activables à la demande.
- **Moteur de Thèmes** : 
  - **Classique** : Traditionnel et sobre.
  - **Moderne** : Épuré avec polices sans-serif (Inter).
  - **Exécutif** : Luxe et prestige (Sérif/Doré).
  - **Tunisien** : Couleurs et esthétique locale.

---

## 🔒 Sécurité & Architecture

| Composant | Technologie | Détails |
|---|---|---|
| **Runtime** | Electron.js v28 | Performance native sur Desktop. |
| **Base de données** | better-sqlite3 | Stockage local ultra-rapide en mode WAL. |
| **Sécurité** | safeStorage | Chiffrement matériel des identifiants SMTP. |
| **Moteur PDF** | Offscreen Rendering | Rendu A4 parfait, indépendant de l'UI. |
| **Confidentialité** | bcryptjs | Hachage sécurisé des mots de passe utilisateurs. |

---

## 🚀 Quoi de neuf dans la v2.6.2 ?

- **Auto-Updater Mac Robuste** : Nouveau système de mise à jour pour macOS avec détection intelligente du cache, copie automatique vers le dossier Téléchargements et fallback vers le site officiel en cas d'erreur.
- **Nouveaux Documents** : Support complet pour les Bons de Livraison (BL), Bons d'Achat (BA), Bons de Sortie (BS), et Bons d'Entrée (BE).
- **Gestion des Avoirs** : Nouvelle logique de Facture d'Avoir avec impact négatif sur le chiffre d'affaires et réduction automatique de la dette client.
- **Recherche RNE Live** : Intégration de l'API publique du Registre National des Entreprises pour récupérer les données clients instantanément via leur MF.
- **WhatsApp Pro** : Icône officielle WhatsApp et interface de partage améliorée.
- **Optimisation Financière** : Tous les calculs de revenus et impayés prennent désormais en compte les avoirs et les nouveaux types de documents.
- **Stabilité** : Correction des bugs d'affichage de version et amélioration des performances de la base de données.

---

## 📦 Installation & Déploiement

### Téléchargement
Retrouvez les installateurs pour votre système sur la page des [Releases](https://github.com/a32116150-ctrl/tuninvoice/releases).

### Développement Local
```bash
# Clonez le dépôt
git clone https://github.com/a32116150-ctrl/tuninvoice.git

# Installez les dépendances
npm install

# Lancez l'application
npm start

# Construisez les binaires
npm run build:mac  # Pour macOS (.dmg)
npm run build:win  # Pour Windows (.exe)
```

---

<p align="center">
  Développé par <strong>Anoir Cherif</strong> en Tunisie 🇹🇳<br/>
  © 2026 Factarlou. Tous droits réservés.
</p>
