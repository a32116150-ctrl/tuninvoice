<h1 align="center">
  <img src="assets/iconblack2.png" alt="Factarlou Logo" width="120" height="120"><br/>
  Factarlou
</h1>

<p align="center">
  <strong>L'Excellence de la Gestion Fiscale et Commerciale en Tunisie</strong><br/>
  Une application de bureau haute performance, confidentielle et sécurisée pour entrepreneurs et PME.
</p>

<p align="center">
   <img src="https://img.shields.io/badge/version-3.0.0-blue?style=for-the-badge" alt="Version"/>
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey?style=for-the-badge" alt="Platform"/>
  <img src="https://img.shields.io/badge/built%20with-Electron-47848F?style=for-the-badge&logo=electron" alt="Electron"/>
  <img src="https://img.shields.io/badge/license-MIT-green?style=for-the-badge" alt="License"/>
</p>

---

## 📖 À propos

**Factarlou** est bien plus qu'un simple logiciel de facturation. C'est un écosystème complet de gestion conçu spécifiquement pour le cadre légal et fiscal **Tunisien**. Entièrement **Offline-First**, il garantit que vos données financières sensibles restent exclusivement sur votre machine, sans aucun passage par le cloud.

De la génération de factures conformes à l'exportation XML pour la plateforme **TEJ**, Factarlou automatise vos processus tout en assurant une précision chirurgicale (3 décimales).

---

## ✨ Fonctionnalités Majeures (v3.0.0)

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
- **Assistant Déclaration TVA** : Génération d'un récapitulatif mensuel TVA collectée/déductible avec calcul automatique du solde.
- **Rapports Financiers** : Compte de Résultat (P&L) avec revenus vs dépenses et résultat net, Bilan Annuel (actifs/passifs), Déclaration TVA Annuelle mois par mois.
- **Convertisseur de Devises** : Agrège les totaux des documents par devise et convertit à un taux défini.
- **Graphe Relationnel** : Découverte automatique des patterns de vente croisée (algorithme Apriori), analyse du comportement de paiement par article, et récurrence client.
- **Simulateur de Scénarios Fiscaux** : Comparez l'impact fiscal de différentes stratégies (changement de type, taux TVA, remise, timbre) avant d'éditer le document.
- **Ressources** : Calendrier fiscal tunisien et annuaire complet des Recettes des Finances.

### 👥 Ressources Humaines & Paie
- **Gestion du Personnel** : Base de données employés avec suivi des contrats (CDI, CDD, CIVP).
- **Bulletins de Paie** : Génération automatique de fiches de paie avec calcul des cotisations CNSS (@ 9.18%).

### 📊 Tableau de Bord & Analytics
- **Dashboard Amélioré** : Graphique d'évolution mensuelle des revenus et dépenses + classement Top 5 clients.
- **Rapports Financiers** : P&L (Compte de Résultat), Bilan Annuel, Déclaration TVA Annuelle — accessibles depuis la page Outils.
- **Convertisseur de Devises** : Outil de conversion multi-devises avec filtrage par période.
- **Graphe Relationnel** : Data mining embarqué (Apriori) pour détecter les associations d'articles, le comportement de paiement et la récurrence client.
- **Simulateur de Scénarios** : Outil de simulation "what-if" pour comparer l'impact fiscal de différentes configurations documentaires.

### 🗒️ Notes & Productivité
- **Notes Adhésives** : Notes colorées avec épinglage, accessibles depuis le menu latéral et le tableau de bord.
- **Opérations par Lot** : Sélection multiple et actions groupées (supprimer, marquer payé) sur les documents.

### 🎨 Branding & Design Premium
- **Interface Premium** : Design CSS haut de gamme avec ombres portées, dégradés subtils, micro-interactions (lift, glow, accent bars) et transitions fluides.
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

## 🚀 Quoi de neuf dans la v3.0.0 ?

- **Refonte Complète de la Page Paramètres** : Navigation latérale avec onglets persistants, cartes améliorées avec descriptions et infobulles contextuelles, transitions animées entre sections.
- **Refonte de la Page Mon Entreprise** : Même design que les Paramètres — cartes avec en-têtes + descriptions, boîtes d'info contextuelles, barre de sauvegarde dédiée, icône Lucide `building`.
- **Correction Critique — Séquence de Numérotation** : Le compteur n'est plus consommé à l'ouverture du formulaire ou au changement de type. Incrémenté uniquement à la sauvegarde réelle. Permet la saisie manuelle du numéro si nécessaire.
- **Point de Vente (POS) — Caisse Enregistreuse Complète** : Grille produits, scan code-barres, panier, paiement multiple (Espèces/Carte/Mobile/Chèque), gestion de stock, sessions de caisse, ticket 80mm.
- **Rapport X (Mi-Journée)** : Résumé intermédiaire des ventes sans fermeture de session — fond, ventes, transactions, mouvements de caisse. `F5`.
- **Override Prix** : Double-clic sur le total d'une ligne dans le panier pour modifier le prix unitaire. Badge "PRIX MODIFIÉ".
- **Création Produit Rapide** : Nouveau bouton dans la barre d'outils du POS — modal avec nom, prix, TVA, catégorie, code-barres, stock. `F7`.
- **Favoris** : Étoile ☆/★ sur chaque fiche produit. "⭐ Favoris" dans les catégories. Stocké dans localStorage. `F6`.
- **Split Tender (Paiement Multiple)** : Répartissez le total sur plusieurs moyens de paiement avec montants modifiables. Enregistré dans les notes du document.
- **Mouvements de Caisse** : Apports/retraits d'argent pendant la session. Inclus dans le Rapport X et le résumé de clôture. `F8`.
- **Remboursement** : Depuis les ventes du jour — inverse le stock, crée un document négatif. Badge "REMBOURSÉ".
- **Fidélité** : 1 point par 10 TND d'achat. Stocké dans localStorage. Affiché sur le ticket et dans une modale dédiée. Bouton ⭐ dans la barre supérieure.
- **Multi-Caissier** : Champ de saisie du nom de l'opérateur dans la barre supérieure. Imprimé sur le ticket.
- **Recherche de Clients CRM** : Autocomplétion des clients depuis la base de données dans la modale de paiement.
- **Top Ventes** : Grille des 10 produits les plus vendus aujourd'hui pour ajout rapide.
- **Brouillons Multiples** : Sauvegardez plusieurs paniers dans localStorage avec nom, restaurez-les, supprimez-les.
- **Notes sur le Ticket** : Champ de texte dans le panier pour ajouter une note sur le ticket de caisse.
- **Acompte / Crédit** : Paiement partiel avec suivi du reste à payer dans les notes du document.
- **Image Produit** : Colonne `image` dans la table services. Affichage de la vignette sur les fiches produits du POS.
- **Pied de Ticket Personnalisé** : Message personnalisable affiché en bas du ticket de caisse.
- **Interface Tactile** : Tous les boutons, contrôles et éléments du POS optimisés pour le tactile (zones de触碰 ≥44px, retours visuels `:active`, `touch-action: manipulation`).
- **Raccourcis Clavier** : `F1` plein écran, `F2` scan, `F3` TTC, `F4` ventes, `F5` Rapport X, `F6` Favoris, `F7` Nouveau produit, `F8` Mouvement de caisse.
- **Nettoyage** : Suppression du module orphelin `Themes.js`.

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
