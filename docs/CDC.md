# Cahier des Charges Préliminaire : Application Web de Gestion de Budget Personnel

## 1. Objectif Général de l'Application

L'objectif principal est de fournir une application web personnelle permettant de gérer, suivre et analyser les finances (dépenses, revenus, comptes bancaires, prêts) de manière intuitive et efficace, avec une visualisation claire des données financières.

## 2. Fonctionnalités Détaillées

- Gestion des Transactions :
    - Enregistrement Manuel : Possibilité d'ajouter manuellement des dépenses et des revenus avec les informations suivantes :
        - Montant
        - Date
        - Description/Libellé
        - Catégorie (personnalisable)
        - Compte bancaire associé
    - Catégorisation :
        - Création, modification et suppression de catégories et sous-catégories (par exemple : "Alimentation" > "Courses", "Restaurant").
        - Attribution d'une catégorie à chaque transaction.
    - Transactions Récurrentes :
        - Gestion des dépenses et revenus récurrents (loyer, salaires, abonnements...).
        - Automatisation de l'ajout de ces transactions selon une fréquence définie (mensuelle, annuelle, etc.).
    - Virements Internes :
        - Possibilité de réaliser des transferts de fonds entre les différents comptes bancaires gérés au sein de l'application.

- Gestion des Comptes Bancaires :
    - Ajout, modification et suppression de plusieurs comptes bancaires (courant, épargne, etc.).
    - Visualisation du solde de chaque compte et du solde agrégé.

- Gestion des Prêts :
    - Enregistrement et suivi d'au moins un prêt (ex: prêt immobilier).
    - Possibilité de suivre le capital restant dû et les échéances.
    - Note : Les fonctionnalités avancées (calcul des intérêts, simulations) sont envisagées pour une phase ultérieure si le besoin se fait sentir.

- Budgétisation :
    - Budgets Fixes : Définition de budgets récurrents pour des catégories spécifiques sur des périodes données (ex: 300€ pour l'alimentation par mois, budget annuel pour certains abonnements).
    - Budgets Flexibles : Possibilité de définir des exceptions aux budgets récurrents pour des mois spécifiques (ex: augmenter le budget "Loisirs" pour un mois de vacances).
    - Budgets Temporaires / Non Récurrents : Création de budgets pour des événements ponctuels ou des projets spécifiques qui ne se répètent pas (ex: budget "Vacances" sur une période définie, pouvant chevaucher deux mois).
    - Suivi de la consommation du budget en temps réel (montant dépensé vs. budget alloué).
    - Alertes visuelles en cas de dépassement ou de rapprochement du budget.

- Visualisation et Analyse (Statistiques/Graphiques) :
    - Tableau de bord principal : Vue d'ensemble des soldes, dépenses/revenus du mois en cours, budgets principaux.
    - Page de Statistiques Détaillées :
        - Graphiques d'évolution des dépenses/revenus par mois/année.
        - Répartition des dépenses par catégorie (camembert, barres empilées).
        - Évolution des soldes de comptes.
        - Comparaison des budgets vs. dépenses réelles.
        - Filtres par période, compte, catégorie.

- Import/Export de Données :
    - Import CSV : Importation des relevés bancaires au format CSV avec un mappage configurable des colonnes vers les champs de transaction de l'application.
    - Export JSON : Exportation des données de l'application au format JSON, principalement pour la sauvegarde de l'environnement ou pour une potentielle intégration future avec des outils tiers (type n8n) pour des analyses ou résumés automatiques.

## 3. Interface Utilisateur (UI) & Expérience Utilisateur (UX)

- Design : Interface moderne, épurée et intuitive. Facilité de navigation.
- Charte Graphique : Prédominance de couleurs sombres pour le fond (type bleu marine), avec des éléments colorés mais non "flashy" pour mettre en valeur les informations.
- Accessibilité : Priorité à l'usage sur ordinateur de bureau.
- Responsivité : L'adaptation mobile n'est pas une priorité immédiate mais est envisagée comme un "plus" pour une évolution future.

## 4. Aspects Techniques

- Frontend (Interface Utilisateur) :
    - Langage : TypeScript
    - Framework : React.js
- Backend (Logiciel Serveur) :
    - Langage : TypeScript
    - Framework : Node.js avec Express.js
- Base de Données :
    - Développement : SQLite

## 5. Sécurité des Données

- Authentification : Mise en place d'un système d'authentification utilisateur simple (login/mot de passe).
- Protection des Données : Mesures de sécurité basiques (hashing des mots de passe, requêtes paramétrées) pour un usage personnel.
- Confidentialité : Les données resteront sur votre serveur personnel, assurant une pleine maîtrise.

## 6. Évolutivité et Considérations Futures

- L'architecture devra permettre l'ajout futur de fonctionnalités telles que :
    - L'accès mobile optimisé.
    - Des fonctionnalités avancées pour la gestion des prêts (calcul des intérêts, simulations de remboursement).
    - Le partage multi-utilisateur (à envisager si le besoin évolue).
    - Intégrations avec d'autres services via l'export JSON.
