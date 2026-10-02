# Audit approfondi SQuizz — 2 octobre 2026

> **Mise à jour du 2 octobre 2026 : les six défauts ci-dessous sont corrigés dans la version 1.10.7** (commit `4569458`, déployée le même jour). Le rapport est conservé tel qu’il a été rédigé sur la 1.10.3 ; une ligne « Corrigé en 1.10.7 » sous chaque défaut résume la correction et son test de régression. Validation des corrections : 18 scénarios d’intégration, 52 tests unitaires, TypeScript, ESLint et build de production, sur une base locale jetable et le simulateur Stripe — elles n’ont pas été rejouées sur le site de production. Détail dans [CHANGELOG.md](CHANGELOG.md).

Version auditée : **1.10.3**. Le code a été figé dans une copie locale pendant que Claude Code travaillait sur le dépôt. Les fichiers applicatifs de cette copie correspondent à ceux des commits `6d5ac3f` et `1f9aee6`. En fin d’audit, le commit `bd408bb` (1.10.4) change seulement les classes de couleur de deux boutons de la page Tarifs ; ce diff a été lu, sans rejouer le build ou les parcours sur cette nouvelle version. Les six chemins défectueux restent identiques. Un manifeste SHA-256 est conservé dans [source-manifest.json](/Users/xaviergerinette/SQuizz/squizz/audit/2026-10-02/source-manifest.json).

**Résultat : six défauts reproduits, dont un prioritaire P1.** Les scénarios habituels passent, ainsi que les principales corrections de l’ancien audit. Cela ne couvre pas encore correctement les achats concurrents, certaines pannes de persistance et les événements de formulaire de l’aperçu.

Aucun code applicatif corrigé ou déployé. Les ajouts au dépôt sont ce rapport, les preuves et une entrée de sonde. Les tests utilisent exclusivement une base locale jetable `squizz_audit_oct02_test`, un simulateur Stripe et SMTP désactivé. Aucun paiement ou e-mail réel, aucune modification du VPS.

## Défauts confirmés

### 1. P1 — Plusieurs pages payables pour le même achat du Pack Événement

> **Corrigé en 1.10.7.** `buyEventPass` passe par la réservation de paiement de l’organisation (celle des abonnements) et garde une identité d’opération avec clé d’idempotence jusqu’à ce que la page existe. Racheter un pack après paiement reste possible. Tests dans `tests/event-pass.py` : quatre achats simultanés ouvrent une seule page (le test échoue sur le code d’avant), reprise après interruption, nouvel achat après paiement.

**Reproduction :** après création du client Stripe et expiration d’une première session, quatre achats simultanés ont créé **quatre URL distinctes et quatre sessions Checkout ouvertes**, sans erreur. Un délai de 600 ms sur le POST du simulateur rend la concurrence déterministe.

`buyEventPass` recherche une session ouverte, puis en crée une, sans réservation commune aux requêtes ni clé d’idempotence durable. Toutes les requêtes peuvent passer la recherche avant la première création. La protection contre les doubles webhooks fonctionne, mais ne protège pas contre deux sessions distinctes payées : elles prolongeraient chacune le pack.

**Correction attendue :** sérialiser les achats par organisation et conserver l’identité de l’opération avant de solliciter Stripe. Reprendre cette identité après une panne ; permettre une nouvelle identité après paiement ou abandon confirmé. Tester les demandes simultanées et les nouvelles tentatives après interruption.

Code : [recherche/création de session](/Users/xaviergerinette/SQuizz/squizz/lib/server/billing.ts:318). Preuve : `event_pass_concurrent` dans [deep-oct02-results.json](/Users/xaviergerinette/SQuizz/squizz/audit/2026-10-02/deep-oct02-results.json).

### 2. P2 — Un achat en cours laisse une session payable après suppression de l’organisation

> **Corrigé en 1.10.7.** `stopBillingForDeletion` prend la réservation de paiement : un achat en cours est attendu, sa page fermée, et la réservation gardée jusqu’à la suppression. Une page créée pour une organisation disparue est expirée. Test dans `tests/event-pass.py` (suppression pendant la création de la page). Limites : ce test n’a pas été isolé pour le voir échouer sur le code d’avant ; si un achat dure plus de six secondes, la suppression répond 409 et doit être relancée.

**Reproduction :** avec le client Stripe déjà créé, le POST de création du pack est retardé de deux secondes. La suppression du compte et de son organisation intervient pendant ce délai. Résultat : organisation absente de PostgreSQL, **une session du pack encore ouverte chez Stripe**. La demande d’achat retourne une erreur, car l’écriture d’audit intervient ensuite avec une organisation/utilisateur supprimés.

La suppression ferme les sessions qu’elle connaît avant la suppression, mais `buyEventPass` peut en créer une après ce contrôle. À la différence du parcours abonnement, il ne vérifie pas après création que l’organisation et l’opération sont encore valides, et n’expire pas cette session.

**Limite importante :** dans cette reproduction, l’URL n’a pas été renvoyée au client et aucun paiement n’a été effectué. La preuve établit une session payable orpheline, pas un débit subi par un utilisateur. Il faut néanmoins empêcher cette situation et la nettoyer avant de confirmer la suppression.

Code : [création du pack](/Users/xaviergerinette/SQuizz/squizz/lib/server/billing.ts:324), [suppression et arrêt de la facturation](/Users/xaviergerinette/SQuizz/squizz/app/api/account/route.ts:53). Preuve : `event_pass_delete_race` dans le JSON des sondes.

### 3. P2 — Répondre dans l’aperçu enregistre réellement le brouillon et quitte l’éditeur

> **Corrigé en 1.10.7.** Le formulaire de l’éditeur ignore les envois qui viennent de ses fenêtres (portails), et les formulaires de réponse de `QuestionPlay` arrêtent la propagation. Contrôle navigateur sur base de test : après « Envoyer ma réponse », l’aperçu reste ouvert, l’adresse ne change pas, titre et version du quiz inchangés en base ; « Enregistrer les modifications » fonctionne toujours. Limite : le test automatique (`tests/forms.spec.ts`) vérifie la présence des deux protections dans le code source, pas le comportement dans un navigateur.

**Reproduction dans le build de production, deux fois :** ouvrir l’éditeur du blind test, changer son titre sans enregistrer, ouvrir « Aperçu », saisir « Aznavour », puis cliquer « Envoyer ma réponse ». Le navigateur quitte l’éditeur vers `/app?ok=modifie` et affiche « Vos modifications sont enregistrées ». Le titre de brouillon est effectivement présent dans PostgreSQL, version 2.

L’aperçu annonce pourtant « Essayez de répondre : rien n’est enregistré ». Le formulaire de réponse appelle `preventDefault()`, mais son événement `submit` remonte au formulaire React de l’éditeur, y compris à travers le portail du dialogue. Le parent déclenche alors `submit()` et enregistre le quiz. Le même chemin est utilisé pour les questions de texte, ouvertes et de nuage de mots ; la reproduction a porté sur le blind test.

**Correction attendue :** empêcher le formulaire parent de traiter les soumissions de ses descendants et arrêter la propagation au bon endroit. Vérifier qu’une réponse simulée garde l’aperçu ouvert, ne change ni le quiz en base ni sa version, et n’efface pas le brouillon.

Code : [formulaire de réponse](/Users/xaviergerinette/SQuizz/squizz/components/squizz/question-play.tsx:92), [formulaire parent](/Users/xaviergerinette/SQuizz/squizz/components/squizz/editor.tsx:95). Preuves : [résultat navigateur et contrôle PostgreSQL](/Users/xaviergerinette/SQuizz/squizz/audit/2026-10-02/browser-oct02-results.json), [capture](/Users/xaviergerinette/SQuizz/squizz/audit/2026-10-02/preview-unexpected-save-oct02.jpg).

### 4. P2 — Les erreurs internes de l’API de jeu échappent au monitoring

> **Corrigé en 1.10.7.** Le gestionnaire de `/api/game` appelle `reportAlert` pour les erreurs inattendues, avec la route, la méthode et l’action ; les refus métier ne créent pas d’alerte. Test dans `tests/monitoring.py` (échoue sur le code d’avant).

**Reproduction :** un trigger temporaire, limité au titre d’un quiz d’audit, refuse son INSERT. `/api/game` retourne une erreur interne ; aucune alerte ne mentionne cette panne. Le contrôle de toutes les alertes portant le chemin `/api/game` donne également **zéro**, alors que les alertes d’autres API sont bien enregistrées.

Le gestionnaire central de cette API capture les erreurs et ne fait que `console.error` avant de répondre 500. Il n’appelle pas `reportAlert`. Comme l’erreur est capturée, elle ne remonte pas non plus à `onRequestError`. Le monitoring rate ainsi les pannes internes sur les actions de bibliothèque et de partie traitées par ce gestionnaire.

**Correction attendue :** signaler ces erreurs inattendues avec la route et l’action, sans conserver de secret ou de contenu utilisateur. Garder les refus métier ordinaires hors des alertes. Vérifier la présence d’une alerte après une panne simulée.

Code : [gestionnaire d’erreur](/Users/xaviergerinette/SQuizz/squizz/app/api/game/route.ts:104). Preuve : `game_api_monitoring` dans le JSON des sondes. Le trigger est retiré dans un `finally`.

### 5. P2 — Une panne d’écriture consomme définitivement le lien de réinitialisation

> **Corrigé en 1.10.7.** Le hash est calculé avant la transaction ; le lien est réclamé et le compte modifié dans la même transaction, et l’e-mail d’avertissement part après. Test dans `tests/auth-hardening.py` : après une panne d’écriture, le lien reste utilisable, puis ne sert qu’une fois (échoue sur le code d’avant).

**Reproduction :** un lien valide est créé. Un trigger temporaire refuse uniquement la mise à jour du hash du mot de passe de ce compte d’audit. La première réinitialisation échoue, puis le trigger est retiré. La même demande retourne alors « Ce lien n’est plus valable. Refaites une demande ». Le token est marqué utilisé alors que l’écriture du mot de passe a échoué.

Le token est réclamé dans une opération déjà validée, avant l’appel séparé à `setPassword`. La panne laisse donc le compte avec son ancien mot de passe et son lien consommé. L’utilisateur doit demander un autre lien, sous réserve des limitations de débit.

**Correction attendue :** calculer le hash puis réclamer le token et mettre à jour le compte dans une même transaction. Une panne doit annuler ces deux écritures, tout en empêchant les utilisations concurrentes. Envoyer la notification après validation de la transaction.

Code : [réinitialisation](/Users/xaviergerinette/SQuizz/squizz/app/api/account/reset/route.ts:14). Preuve : `reset_persistence_failure` dans le JSON des sondes.

### 6. P2 — Les arrivées en attente gardent l’ancien quota après un changement d’offre

> **Corrigé en 1.10.7.** `joinRoom` relit la limite une fois le verrou de la partie obtenu, la ligne de l’organisation étant verrouillée en lecture jusqu’à l’insertion. Les joueurs déjà admis restent. Test dans `tests/event-pass.py` : sept arrivées en attente à la fin du pack, cinq admises, deux refusées (échoue sur le code d’avant : sept admises).

**Reproduction :** partie créée sous Premium ; le verrou PostgreSQL de cette partie est tenu par la sonde. Six nouvelles demandes d’entrée sont lancées, puis l’organisation passe à Gratuit avant de libérer le verrou. Les six demandes réussissent. L’état final annonce **limite de 5 joueurs, mais 6 joueurs admis**. Aucun de ces joueurs n’avait été inséré avant la baisse d’offre.

Le changement récent ferme bien le parcours séquentiel après expiration d’un pack ou baisse d’offre. Toutefois, `room.maxPlayers` est calculé avant l’attente du verrou et réutilisé tel quel dans l’INSERT. L’insertion ne relit pas l’offre ni l’expiration actuelle.

**Correction attendue :** recalculer la limite au point où l’admission est décidée, sous un protocole de verrouillage cohérent avec les changements d’offre. Préserver les joueurs déjà admis, mais contrôler les nouvelles insertions avec le quota actuel. Ajouter ce scénario au test d’expiration.

Code : [lecture avant verrou et insertion](/Users/xaviergerinette/SQuizz/squizz/lib/server/game.ts:155). Preuve : `join_downgrade_race` dans le JSON des sondes.

## Vérifications réussies

| Vérification | Résultat |
|---|---|
| Vitest | 51 tests, 19 fichiers réussis |
| TypeScript | Réussi |
| ESLint du code source | Réussi ; le dossier de build spécifique à l’audit est explicitement exclu |
| Scripts complémentaires `.test.mjs` | Question types, classement et invitations réussis |
| Build de production | Réussi avec `next build --webpack` |
| Intégration existante | 18 scénarios réussis dans la copie isolée |
| Sondes additionnelles | Terminent et consignent leurs observations, y compris les défauts ci-dessus |
| Accès privé sans session, build de production | 5 routes refusées avec 401 |
| Sécurité des réponses | CSP et `nosniff` présents |
| Limitation des inscriptions en production locale | 5 requêtes invalides à 400, puis 429 à la sixième |
| Dépendances npm | `npm audit` : zéro vulnérabilité connue dans le périmètre vérifié, développement inclus |
| PostgreSQL | Dump restauré dans une seconde base jetable ; mêmes nombres de lignes sur 11 tables, puis base de restauration supprimée |
| Scripts shell de déploiement | `bash -n` réussi |
| Navigateur | Connexion, bibliothèque, éditeur, aperçu mobile et masquage du titre du blind test vérifiés |
| Responsive | Vue 390 × 844, largeur du document 390 ; liens de navigation avec noms accessibles et état de sauvegarde visible |

Les 18 scénarios sont : `game-flow`, `rich-game-flow`, `timeout`, `quiz-management`, `accounts`, `contact`, `super-admin`, `game-live`, `rights`, `security`, `editing`, `email-verification`, `transfer`, `admins`, `billing`, `event-pass`, `monitoring`, `auth-hardening`.

Le premier lancement dans le dépôt partagé a rencontré un serveur/test déjà actif, puis une recréation concurrente de la base de test. Ses échecs ont été écartés comme résultats non interprétables. L’intégralité de la suite a été relancée avec succès dans la copie isolée, ses propres dépendances, base et ports 5274/5275. Le serveur de production local utilise 5290.

Le build Turbopack n’a pas été validé : lors des tentatives précédentes, la compilation CSS échouait sur une ouverture de port refusée par l’environnement. Webpack compile le même code avec succès. Cela ne valide pas automatiquement le chemin de build Turbopack utilisé par `npm run build`.

## Ancien audit : corrections revérifiées

Les sondes retrouvent des références d’export distinctes dans cinq essais, aucun quota médias consommé après un import refusé, le même quiz après répétition d’un import au quota, un refus propre des questions nulles, un refus du mot de passe dont seul le suffixe après 72 octets diffère et une ancienne session refusée en lecture comme en écriture du jeu.

Une panne de persistance de Checkout abonnement laisse désormais **une seule session ouverte** après nouvelle tentative. La suppression concurrente d’une organisation et d’un Checkout abonnement ne laisse aucune session ouverte. Les formulaires sensibles sont en POST et leurs boutons attendent l’hydratation. Les liens mobiles ont des noms accessibles. La révocation du polling reste volontairement bornée par un cache de cinq secondes, vérifié dans la suite d’authentification.

Preuves : [previous-findings-recheck-oct02.json](/Users/xaviergerinette/SQuizz/squizz/audit/2026-10-02/previous-findings-recheck-oct02.json).

## Charge locale de production

Cinq organisations, cinq parties de 80 joueurs, trois tours, activité de bibliothèque et polling au rythme de l’application : **400 joueurs HTTP simulés, 67 652 requêtes, 1 200 réponses, aucune erreur ni anomalie d’intégrité en 156 secondes**. Les classements finaux et les scores positifs sont vérifiés. Environ 423 actualisations réussies par seconde et 427 Mio de corps de réponses reçus.

| Action | Requêtes | Médiane | p95 | Erreurs |
|---|---:|---:|---:|---:|
| Entrée des joueurs | 400 | 34 ms | 76 ms | 0 |
| Polling joueurs | 65 046 | 30 ms | 57 ms | 0 |
| Polling animateurs | 811 | 30 ms | 60 ms | 0 |
| Réponses | 1 200 | 18 ms | 39 ms | 0 |
| Actions animateurs | 20 | 21 ms | 24 ms | 0 |
| Bibliothèques | 155 | 13 ms | 50 ms | 0 |
| Contrôles d’intégrité | 20 | 8 ms | 26 ms | 0 |

Preuve : [load-oct02-5x80.json](/Users/xaviergerinette/SQuizz/squizz/audit/2026-10-02/load-oct02-5x80.json). Ce test utilise un worker Node, PostgreSQL et le générateur sur la même machine. Il ne mesure ni la capacité du VPS, ni le rendu de 400 navigateurs, ni les latences mobiles/TLS/Nginx, ni une charge de plusieurs heures. CPU et RAM n’ont pas été mesurés.

## Preuves, reproduction et limites

Les résultats et captures sont conservés dans [audit/2026-10-02](/Users/xaviergerinette/SQuizz/squizz/audit/2026-10-02). Les identifiants jetables du navigateur ne font pas partie des preuves livrées.

La sonde des cinq défauts côté serveur est [deep-oct02.py](/Users/xaviergerinette/SQuizz/squizz/audit/2026-10-02/deep-oct02.py), avec l’entrée [tests/audit-oct02.py](/Users/xaviergerinette/SQuizz/squizz/tests/audit-oct02.py). **Ses observations ne sont pas des assertions de comportement correct** : les défauts sont enregistrés dans le JSON, sans faire échouer systématiquement la sonde. Les convertir en tests de régression lors des corrections.

À exécuter dans une copie isolée du dépôt avec ses propres dépendances, aucun autre test utilisant ses dossiers de build, et PostgreSQL local :

```sh
E2E_DB=squizz_audit_oct02_test E2E_PORT=5274 E2E_STRIPE_PORT=5275 bash scripts/e2e.sh audit-oct02
```

Cette commande recrée uniquement la base dédiée ; la sonde la vérifie explicitement et écrit ses nouveaux résultats dans `/private/tmp/squizz-audit-oct02-results`. Les triggers de panne sont limités aux comptes/quiz d’audit et retirés dans des `finally`. Le défaut de l’aperçu se reproduit manuellement par les cinq étapes de la section 3 ; les parcours navigateur ont utilisé le build local Webpack.

La lecture du code a également couvert les gardes d’accès et rôles, les quotas, le stockage et l’accès aux médias, les jetons d’invitation/vérification, les sessions, les limites de débit, les webhooks et les scripts de sauvegarde/déploiement. Aucun autre défaut exploitable n’est affirmé sans preuve suffisante. Les formats audio et leur masquage sont testés par API ; la lecture effective YouTube, les restrictions des navigateurs sur l’autoplay et le décodage audio sur appareils physiques restent à vérifier.

Pas d’audit des secrets, permissions ou services réellement actifs sur le VPS, pas de restauration réelle base + médias ni de copie NAS, pas de Stripe/SMTP/Turnstile réel, pas de certification RGPD ou accessibilité. La restauration locale valide PostgreSQL sur les tables vérifiées, avec des comptes de lignes concordants, pas l’ensemble du plan de reprise. L’audit des dépendances repose sur les avis connus du registre au moment du contrôle et ne prouve pas l’absence de vulnérabilité applicative.
