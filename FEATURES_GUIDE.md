# Factarlou — Guide des Fonctionnalités

Votre solution de facturation, gestion et point de vente intelligente pour la Tunisie.

---

## Point de Vente (POS / Caisse) — v3.0

Interface de caisse complète pour commerces et marchés :
- **Interface Plein Écran** : Grille produits avec filtres catégorie, recherche/scan unifié (`F2`)
- **Top Ventes** : 10 meilleures ventes du jour en ajout rapide
- **Favoris** : ☆/★ sur chaque fiche, filtre "Favoris" disponible (`F6`)
- **Mode TTC** : Bascule HT/TTC (`F3`), badge bleu "TTC"
- **Scan Code-Barres** : Support scanner USB + recherche par nom
- **Prix Modifiable** : Double-clic sur le total d'une ligne pour modifier le prix unitaire
- **Remise par Ligne** : Remise en % (0-100%) par article, TVA recalculée
- **Quantité Rapide** : Double-clic sur la quantité pour saisie directe
- **Panier** : +/−, mise en attente, brouillons multiples, note sur le ticket
- **Paiement Multiple (Split)** : Répartition sur plusieurs moyens de paiement
- **Acompte** : Paiement partiel avec solde suivi dans les notes
- **Recherche Client CRM** : Autocomplétion depuis la base clients
- **Fidélité** : 1 point par 10 TND d'achat, affiché sur le ticket
- **Multi-Caissier** : Nom de l'opérateur imprimé sur le ticket
- **Ventes du Jour** : Historique complet, remboursement par vente (`F4`)
- **Rapport X** : Résumé mi-journée sans fermeture (`F5`)
- **Rapport Z** : Rapport fin de journée imprimable
- **Mouvements de Caisse** : Apports/retraits en session (`F8`)
- **Création Produit Rapide** : Depuis le POS (`F7`)
- **Stock** : Suivi optionnel, rupture grisée, déduction auto, alerte stock bas
- **Sessions de Caisse** : Ouverture/clôture avec fond, écart détecté
- **Optimisé Tactile** : Zones ≥44px, retour visuel actif
- **Raccourcis** : `F1` plein écran, `F2` recherche, `F3` TTC, `F4` ventes, `F5` X, `F6` favoris, `F7` produit, `F8` caisse

---

## Gestion des Documents

**8 types de documents** : Facture, Avoir, Devis, Bon de Commande, BL, BA, BS, BE
- Pipeline Devis → Facture → BL avec suivi de conversion
- BA → Dépense en un clic
- Numérotation intelligente (compteur à la sauvegarde uniquement)
- Saisie manuelle du numéro possible
- 4 thèmes PDF (Classique, Moderne, Exécutif, Tunisien) + personnalisable
- Modèles de documents réutilisables
- Glisser-déposer des articles
- Sauvegarde automatique des brouillons
- Dates en langage naturel (aujourd'hui, demain, +30d, fin de mois)
- Duplication et conversion en un clic
- Champs personnalisés et notes internes

---

## Conformité Fiscale Tunisienne

- **TVA** : 0%, 7%, 13%, 19% multi-taux
- **Timbre Fiscal** : 1.000 TND automatique
- **Retenue à la Source** : Certificats 0.5% à 15%
- **Export TEJ XML** : Fichiers réglementaires
- **Précision 3 décimales** (Millimes)
- **Assistant Déclaration TVA** : Mensuel avec solde
- **Rapport TVA Annuel** : Mois par mois

---

## Scanner Intelligent (OCR)

- Import photo/PDF → Extraction auto (fournisseur, date, montant)
- Bilingue Français/Arabe (Tesseract.js)
- Texte → Montant : "deux cent dinars" → 200.000
- Cache worker persistant

---

## Boîte à Outils Fiscale

- **Calculatrices** : Pénalités, IRPP, TVA
- **Générateurs** : Relances, PV d'AG
- **Vérificateur MF** + **Recherche RNE** en direct
- **P&L**, **Bilan Annuel**, **TVA Annuelle**
- **Simulateur de Scénarios** : What-if avec comparaison 3 colonnes
- **Graphe Relationnel (Apriori)** : Associations, risques, récurrence
- **Convertisseur de Devises**

---

## Ressources Humaines

- Base employés avec contrats (CDI, CDD, CIVP)
- Fiches de paie avec CNSS (@ 9.18%)
- Contrats de travail

---

## Tableau de Bord

- Graphique revenus/dépenses (Canvas)
- Top 5 clients
- Impayés priorisés
- Redimensionnement auto

---

## Notes & Productivité

- Notes adhésives (couleurs, épinglage, widget dashboard)
- Opérations par lot (supprimer, marquer payé, exporter, email)
- Modèles d'email
- Factures récurrentes (auto-génération)
- Recherche rapide sur toutes les pages
- Tri par colonnes, pagination
- Import/Export CSV et Excel
- Carte client Leaflet
- Multi-langue (FR/EN/AR)

---

## Paramètres & Mon Entreprise

- Barre latérale 5 onglets avec persistance
- Format des nombres, préfixes documents
- 4 thèmes + personnalisation avec aperçu
- Sauvegarde planifiée/manuelle/auto
- Factures récurrentes

---

## Mise à Jour Automatique

- Vérification au démarrage et manuelle
- **Windows** : Installation auto avec redémarrage
- **macOS** : Copie DMG dans Téléchargements avec instructions
- Barre de progression (Windows tâche / macOS dock)
- Notifications d'erreur visibles (v3.1.0)

---

## Raccourcis Clavier

| Raccourci | Action |
|-----------|--------|
| `Cmd/Ctrl + N` | Nouvelle facture |
| `Cmd/Ctrl + Shift + N` | Nouveau devis |
| `Cmd/Ctrl + F` | Recherche globale |
| `Cmd/Ctrl + S` | Sauvegarder le document |
| `Échap` | Fermer la modale |
| `F1` | POS plein écran |
| `F2` | POS focus scan |
| `F3` | POS TTC toggle |
| `F4` | POS ventes jour |
| `F5` | POS Rapport X |
| `F6` | POS favoris |
| `F7` | POS nouveau produit |
| `F8` | POS mouvement caisse |

---

<p align="center">
  Propulsé par <strong>Factarlou</strong> 🇹🇳<br/>
  <em>La facturation moderne, simple et sécurisée.</em>
</p>
