# Factarlou - Release v4.5.0

Cette mise à jour majeure (V4.5) apporte de toutes nouvelles fonctionnalités cruciales pour la gestion de l'entreprise, améliore la base de données et optimise considérablement l'expérience utilisateur, notamment sur les petits écrans.

## 🚀 Nouvelles Fonctionnalités
- **Système d'Alertes de Stock** : Ajout d'un widget dédié sur le Dashboard pour surveiller en temps réel les produits en rupture de stock ou dont la quantité est faible.
- **Base de données Fournisseurs (CRM)** : Nouvelle section complète permettant d'ajouter, de gérer et de suivre l'historique d'achats avec tous vos fournisseurs.
- **Déduction Automatique du Stock** : Les Factures et les Bons de Livraison (BL) déduisent dorénavant automatiquement les quantités du stock lors de leur création.
- **Duplication de Documents** : Fonctionnalité permettant de dupliquer facilement un devis, une facture ou un BL existant en un clic.

## 🛠 Corrections & Améliorations de l'Interface
- **Refonte Responsive du Dashboard** : Ajustement de la taille des cartes de statistiques et des marges pour éviter le chevauchement ou le dépassement du texte.
- **Optimisation du Tableau "Documents Récents"** : Le tableau du Dashboard a été compressé intelligemment. Les colonnes inutiles ont été cachées sur cette vue pour garantir que l'ensemble tienne parfaitement dans la largeur de l'écran sans aucun ascenseur horizontal (slider).
- **Point de Vente (POS)** : Correction d'un bug critique qui empêchait le chargement de l'interface de caisse et des produits. La caisse charge maintenant instantanément avec les images des produits en grille plein écran.
- **Bouton Raccourcis Clavier** : Remplacement du symbole ambigu `?` en haut à droite, qui a été proprement supprimé ou remplacé pour un design plus épuré de la barre supérieure.

## ⚙️ Stabilité et Base de données
- Consolidation du système de sauvegarde automatique.
- Ajout d'une protection contre les erreurs de duplication de produits lors de l'ajout rapide de lignes de facturation.
- Migration automatique de la base SQLite pour intégrer les tables `suppliers` et la colonne `stock` dans les produits.
