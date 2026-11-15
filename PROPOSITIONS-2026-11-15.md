# Propositions commerciales — 15 novembre 2026

Deux propositions **à valider avant toute mise en œuvre**. Rien de ce document n’est activé dans le code : les offres, les montants, les identifiants Stripe et les droits existants sont inchangés.

---

## 1. Essai « première vraie séance » (25 à 30 joueurs)

### Le problème

L’offre Gratuit plafonne à 5 joueurs par partie. Une association, un service jeunesse ou un formateur ne peut donc pas vérifier SQuizz dans sa situation réelle (une salle de 20 à 30 personnes) sans payer d’abord 15 € ou 29 €. La démo publique (`/demo`) montre l’expérience d’un joueur, mais pas une salle qui joue ensemble.

### Proposition

**Une partie d’essai jusqu’à 30 joueurs, une seule fois par organisation, utilisable pendant 14 jours après la confirmation de l’adresse e-mail.**

| Règle | Proposition | Pourquoi |
|---|---|---|
| Joueurs | 30 au plus pour cette partie | Couvre une classe ou une salle de formation ; reste loin des 80 du Pack Événement (29 €), qui garde son intérêt |
| Nombre | 1 partie | Une vraie séance, pas un usage gratuit récurrent |
| Durée de validité | 14 jours après la confirmation de l’adresse | Laisse le temps de préparer la séance, crée une échéance |
| Quiz | Ceux de l’espace (quota Gratuit inchangé : 1 quiz) ou les modèles et Originals | Pas de nouveau quota à gérer |
| Fonctions | Toutes, comme aujourd’hui | Déjà le cas pour toutes les offres |

### Éligibilité

- Organisation sur l’offre Gratuit, sans abonnement en cours ni Pack Événement actif.
- Adresse e-mail de l’administrateur confirmée (déjà obligatoire pour se connecter).
- Jamais d’essai consommé auparavant par cette organisation.
- Pas de statut partenaire (il donne déjà Premium).

### Protections contre les abus

- **Une seule fois par organisation**, enregistrée en base (`Organization.trialUsedAt`), écrite sous le verrou d’organisation existant (`lib/server/org-lock.ts`) pour que deux lancements simultanés ne consomment pas deux essais.
- **Consommé seulement quand la salle dépasse 5 joueurs** (au 6ᵉ joueur entré, sous le verrou de la partie déjà utilisé par `joinRoom()`) : une partie de test à deux ne « brûle » pas l’essai, et l’essai n’a de valeur que pour une vraie salle.
- **Multiplication des comptes** : les limites d’inscription existantes s’appliquent (débit par adresse IP, confirmation de l’adresse). À ajouter : liste de domaines d’e-mails jetables refusés pour l’essai (pas pour l’inscription), et au plus un essai par adresse IP sur 30 jours. Un abus résiduel coûte peu (une partie de 30 joueurs, pas de quota durable).
- **Pas de cumul** avec un Pack Événement ou une offre payante : la limite effective reste `max(limite de l’offre, 30)` pour la seule partie d’essai.

### Retour aux limites normales

- La partie d’essai garde ses joueurs jusqu’à sa fin (même mécanisme qu’à la fin d’un Pack Événement : `toRoom()` et `joinRoom()` relisent la limite au moment de l’entrée).
- Toute partie lancée ensuite revient à 5 joueurs. Les quiz et les résultats sont conservés.
- La page Abonnement affiche « Essai utilisé le … » et propose les offres ; un e-mail de fin d’essai (optionnel) rappelle les offres et le Pack Événement.

### Comptes existants

- Proposer l’essai aux organisations Gratuit **qui n’ont jamais payé** (ni abonnement ni pack), sur la page Abonnement, sans activation automatique.
- Ne rien changer pour les organisations payantes ou partenaires.
- Pas d’envoi d’e-mail de masse sans validation séparée (RGPD : intérêt légitime à documenter, lien de désinscription).

### Support et coûts

- **Serveur** : marginal. Le test de charge du 15/11 (3 salles × 80 joueurs en conditions dégradées, 0 erreur) et celui d’octobre (5 × 80) couvrent largement des salles de 30. Ces mesures restent locales : les rejouer en préproduction avant d’ouvrir l’essai.
- **Stripe** : aucun impact (pas de paiement).
- **Support** : attendre des questions sur « pourquoi 5 joueurs maintenant ? ». Prévoir une phrase claire dans la salle d’attente et la page Abonnement, et une entrée de FAQ.
- **Risque commercial** : cannibalisation partielle du Pack Événement pour de très petits événements (≤ 30 personnes, une seule partie). À mesurer : part des essais suivis d’un abonnement ou d’un pack dans les 30 jours.

### Travail estimé

Migration (`trialUsedAt`, `trialUntil`), règle dans `orgLimits()` / `createRoom()` / `joinRoom()`, affichage bibliothèque + salle d’attente + Abonnement, tests d’intégration (concurrence au 6ᵉ joueur, double lancement, expiration, cumul refusé). Environ 1,5 à 2 jours avec tests.

### Décisions attendues

1. 30 joueurs, ou 25 ?
2. 1 partie, ou 2 ?
3. Validité de 14 jours ?
4. Proposer l’essai aux comptes Gratuit existants ?

---

## 2. IA intégrée, financée par SQuizz

### Situation actuelle (inchangée)

L’organisation enregistre sa propre clé API Claude ou ChatGPT ; chaque génération est facturée par le fournisseur à l’organisation. Depuis cette version, ce prérequis est annoncé avant l’écran de configuration (tarifs, FAQ, notice, fenêtre IA, message aux membres non administrateurs). Plafond existant : 40 générations par jour et par organisation (`PER_DAY` dans `lib/server/ai.ts`).

### Proposition

Un **crédit de générations inclus** dans les offres payantes, appelé avec une clé API de SQuizz, la clé de l’organisation restant possible au-delà ou à la place.

| Offre | Générations incluses par mois (à décider) |
|---|---|
| Gratuit | 0 (ou 3 à l’inscription, pour essayer) |
| Essentiel | à définir |
| Pro | à définir |
| Premium / Pack Événement | à définir |

### Coûts : comment les estimer

Aucun prix n’est figé ici : les tarifs des fournisseurs changent. Coût d’une génération = jetons d’entrée × prix d’entrée + jetons de sortie × prix de sortie, au tarif publié le jour de la décision.

- Entrée : consignes (~1 500 jetons) + texte collé (jusqu’à 60 000 caractères, soit environ 15 000 jetons) ou PDF (jusqu’à 10 Mo, souvent bien plus de jetons).
- Sortie : jusqu’à 16 000 jetons (`max_tokens`), en pratique 2 000 à 6 000 pour 10 à 20 questions.
- Mesurer d’abord sur 50 générations réelles (avec des clés d’organisations volontaires ou une clé de test) pour obtenir une médiane et un 95ᵉ centile, puis fixer les crédits pour que le coût du 95ᵉ centile reste une petite part du prix de l’offre.
- Choisir le modèle en conséquence (un modèle plus léger pour les crédits inclus, le modèle complet avec la clé de l’organisation).

### Protections contre les abus

- Crédits **mensuels par organisation**, décomptés sous le verrou d’organisation ; plafond quotidien conservé.
- Taille d’entrée réduite pour les crédits inclus (par ex. 20 000 caractères, PDF de 20 pages) ; au-delà, clé de l’organisation.
- Adresse confirmée et offre payante obligatoires ; débit par membre en plus du débit par organisation.
- **Plafond de dépense global** côté fournisseur (limite mensuelle du compte API de SQuizz) et coupure automatique côté SQuizz à un budget mensuel fixé, avec alerte au monitoring à 50 %, 80 % et 100 %.
- Aucune génération relancée automatiquement après un échec facturé ; la reprise d’enregistrement existante (« Réessayer l’enregistrement » sans relancer l’IA) est conservée.

### Suivi de consommation

- Nouvelle table `AiUsage` : organisation, membre, fournisseur, modèle, jetons d’entrée et de sortie (lus dans la réponse du fournisseur), coût estimé, source (crédit inclus ou clé de l’organisation), date. Jamais le contenu envoyé ni la clé.
- Page Abonnement : crédits restants du mois.
- Super-admin : consommation par organisation et totale, coût estimé du mois, alertes.
- Purge : 12 mois, comme le journal.

### Points juridiques

- Le contenu des organisations passerait par **le compte de SQuizz** chez le fournisseur : mettre à jour la politique de confidentialité (section 2.3, sous-traitants) et les CGU, vérifier l’accord de traitement des données du fournisseur et ses options de conservation des données.
- Conserver la mention « L’IA peut se tromper : relisez avant de lancer ».

### Travail estimé

Clé SQuizz dans les secrets du serveur, table et migration, décompte transactionnel, budget global, affichage des crédits, super-admin, tests (concurrence sur le dernier crédit, budget atteint, bascule vers la clé de l’organisation). Environ 3 jours, hors rédaction juridique.

### Décisions attendues

1. Crédits par offre, et budget mensuel global maximal.
2. Fournisseur et modèle des crédits inclus.
3. Quelques générations offertes à l’offre Gratuit, ou non.
