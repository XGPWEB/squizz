# Audit approfondi SQuizz — 1er octobre 2026

Version auditée : **1.8.1**, commit `5c0363700beb1c61b92a364275ec1e432474eea6`. Le code applicatif n'a pas été modifié. Les fichiers ajoutés sont des sondes et des preuves d'audit. Aucun paiement réel, envoi d'e-mail ou accès au VPS n'a été effectué.

**Résultat : huit problèmes confirmés**, dont trois à traiter en priorité (P1). Les corrections du précédent audit sont présentes et leurs scénarios habituels passent ; une panne supplémentaire révèle toutefois une lacune dans la reprise de Checkout.

**Vérifications réussies**

| Vérification | Résultat |
|---|---|
| TypeScript, ESLint, Prettier, build de production | Réussis |
| Vitest | 35 tests, 14 fichiers réussis |
| Scripts complémentaires `.test.mjs` | 3 réussis |
| Intégration existante | 15 scénarios réussis, dont `admins` et `billing` |
| Production locale : API privées sans session | 5 routes refusées avec 401 |
| Production locale : en-têtes de sécurité | CSP et `nosniff` présents |
| Production locale : plafond d'inscription | 5 requêtes invalides refusées avec 400, puis 429 à la sixième |
| Navigateur, build de production | Connexion, bibliothèque, création de quiz, aperçu, réponse simulée, fermeture par Échap, enregistrement réussis |
| Responsive | Vue mobile 390 × 844 et bureau ; aucun débordement global dans l'éditeur testé |
| Charge locale | 50 joueurs, 200 lectures, 20 requêtes simultanées : 200 réponses réussies |
| Restauration PostgreSQL | Dump de `squizz_e2e` restauré dans `squizz_audit_restore_test`, mêmes comptes sur sept tables, base de restauration supprimée |
| Syntaxe des scripts de déploiement | `bash -n` réussi |

Les 15 scénarios d'intégration ont chacun réussi avant une erreur de chemin dans le lancement initial de la sonde additionnelle ; cette sonde a ensuite été lancée séparément avec un wrapper adapté. Les résultats de la suite existante ne sont donc pas présentés comme ceux d'un unique processus global terminé avec succès.

**Problèmes confirmés**

1. **P1 — Mot de passe dans l'URL avant hydratation.** Le formulaire commun ne définit pas `method`. Lorsque le gestionnaire React n'est pas actif, le navigateur soumet par GET sur la page courante. Observé dans le navigateur de test sur `/connexion?email=…&password=…` avec des identifiants jetables. Cela expose le mot de passe à l'historique et aux journaux HTTP. La connexion normale du build de production, une fois JavaScript actif, a réussi. Le problème est le comportement de secours lorsque JavaScript est absent, retardé ou en échec. Même composant utilisé pour inscription, connexion super-admin, invitation et réinitialisation. Définir une méthode sûre et empêcher la soumission sensible tant que le chemin de traitement n'est pas prêt, ou fournir un véritable traitement serveur. [AuthForm](/Users/xaviergerinette/SQuizz/squizz/components/auth/auth-form.tsx:31).

2. **P1 — Deux Checkout ouverts après une panne d'enregistrement.** Un trigger temporaire dans la seule base isolée a refusé la persistance de `checkoutSessionId` après la création de la session chez Stripe simulé. La première requête échoue ; après suppression du trigger, la nouvelle tentative crée une seconde session. **Deux sessions ouvertes pour la même organisation**, confirmées dans l'état du simulateur. La clé d'idempotence dépend de la nouvelle réservation et change entre les tentatives ; la session non enregistrée n'est pas recherchée chez Stripe. Le webhook peut ensuite annuler un abonnement en double, mais cela ne garantit pas l'absence de deuxième paiement initial. Conserver une identité durable de l'opération et récupérer/expirer les sessions ouvertes non enregistrées avant une nouvelle création. Aucun débit ni remboursement réel n'a été testé. [Persistance Checkout](/Users/xaviergerinette/SQuizz/squizz/lib/server/billing.ts:222). Preuve : [billing-interruption.json](/Users/xaviergerinette/SQuizz/squizz/audit/billing-interruption.json).

3. **P1 — Export de médias avec références dupliquées.** Cinq exports d'un quiz contenant deux médias distincts par leur URL ont produit une référence répétée `1` pour les deux fichiers dans quatre essais. Les fonctions parallèles lisent `files.length` avant la lecture asynchrone du fichier ; elles peuvent donc réserver le même numéro. L'import ignore ensuite le second fichier portant cette référence, ce qui peut remplacer les illustrations de plusieurs questions par la première. Réserver les références avant les opérations asynchrones, avec une promesse partagée par média, ou traiter la réservation séquentiellement. [Export](/Users/xaviergerinette/SQuizz/squizz/lib/server/quiz-transfer.ts:50).

4. **P2 — Mots de passe longs tronqués silencieusement.** Un mot de passe composé de 72 caractères ASCII suivis de `-original` a été remplacé lors de la connexion par le même préfixe suivi de `-different` : connexion acceptée. Le schéma accepte 200 caractères, alors que le hachage bcrypt utilisé ne distingue pas la partie après 72 octets. Cela ne permet pas de deviner le préfixe secret, mais rend certaines modifications de mot de passe inefficaces. Limiter explicitement les octets ou utiliser une stratégie de hachage adaptée, en préservant la compatibilité des comptes existants. [Schéma](/Users/xaviergerinette/SQuizz/squizz/lib/server/api.ts:38), [hachage](/Users/xaviergerinette/SQuizz/squizz/lib/server/accounts.ts:12).

5. **P2 — Lecture du jeu après révocation de session.** Après changement du mot de passe, l'ancien cookie peut encore lire `/api/game?action=state&code=…` en tant qu'animateur (`host: true`). L'action d'écriture testée est refusée. `lightIdentity()` décode le JWT sans vérifier `sessionVersion`, l'activité du compte ou la suspension de l'organisation. La révocation protège donc les écritures mais pas cette lecture. Contrôler la révocation sur le polling, éventuellement avec un cache court explicitement borné. [Identité du polling](/Users/xaviergerinette/SQuizz/squizz/lib/identity.ts:31).

6. **P2 — Un import refusé consomme le quota médias.** Import d'une question invalide contenant une image valide : erreur de validation, aucun quiz créé, mais usage médias passé de 0 à 44 octets. L'écriture des fichiers précède la validation complète du quiz, sans nettoyage sur échec. Les tentatives peuvent accumuler les médias et bloquer la création jusqu'à la purge après sept jours. Valider le quiz et tous ses fichiers avant de les enregistrer, puis nettoyer les ressources créées si une étape échoue. [Import](/Users/xaviergerinette/SQuizz/squizz/lib/server/quiz-transfer.ts:114).

7. **P2 — Nouvelle tentative d'import refusée au quota.** Organisation gratuite : le premier import avec `clientKey` crée son unique quiz. La même demande répétée avec la même clé échoue au plafond d'un quiz au lieu de renvoyer celui déjà créé. Le contrôle de quota précède la recherche de la clé. Après une réponse perdue, le client peut croire que son import a échoué. Résoudre l'opération déjà enregistrée avant le quota ; protéger aussi les imports concurrents qui partagent la même clé pour éviter des fichiers inutiles. [Ordre des contrôles](/Users/xaviergerinette/SQuizz/squizz/lib/server/quiz-transfer.ts:87).

8. **P2 — Liens de navigation sans nom accessible sur mobile.** Dans la vue 390 px de l'espace connecté, « Mes quiz », « Équipe » et « Abonnement » disparaissent de l'arbre d'accessibilité : seuls les liens/URL restent. Les libellés sont en `display: none` et les icônes ont `aria-hidden`, sans `aria-label` sur les liens. Un lecteur d'écran ne dispose plus du nom de chaque destination. Garder un nom accessible indépendant du texte masqué. [Liens](/Users/xaviergerinette/SQuizz/squizz/components/site/app-bar.tsx:105), [CSS mobile](/Users/xaviergerinette/SQuizz/squizz/app/styles/app.css:230).

**Résultats de charge**

Le premier passage a mesuré 200 lectures en 0,474 s, avec 50 joueurs et 20 requêtes concurrentes : médiane **40,7 ms**, 95e percentile **85,8 ms**, maximum **114,1 ms**, aucune erreur. Il s'agit de courtes rafales sur la machine locale avec le serveur de développement. Ce résultat ne mesure ni les latences mobiles, ni une charge soutenue, ni la capacité du VPS en production.

**Dépendances et vérifications secondaires**

`npm audit` signale quatre packages de développement : `@babel/core` 7.29.0 (faible), `brace-expansion` 1.1.14 / 5.0.6 (élevée), `browserslist` 4.28.2 (élevée), `js-yaml` 4.1.1 (élevée). Ils proviennent de la chaîne ESLint. `npm audit --omit=dev` signale **zéro vulnérabilité connue** dans son périmètre ; cela ne prouve pas l'absence de vulnérabilité applicative. Exemples de sources vérifiées : [avis Babel](https://github.com/advisories/GHSA-4x5r-pxfx-6jf8), [avis js-yaml](https://github.com/advisories/GHSA-2883-xcg3-v3hh). Mettre à jour les dépendances de développement et vérifier les contrôles ensuite ; aucun `npm audit fix` n'a été appliqué.

Deux points supplémentaires sont à vérifier avant une prochaine livraison, sans les confondre avec les huit problèmes reproduits :

- Un export peut dépasser la limite d'import : une vidéo autorisée de 20 Mio devient environ 26,7 Mio en base64, au-delà des 22 Mio de Nginx. Plusieurs médias peuvent aussi dépasser le plafond de 20 Mio décodés. Le code d'export n'impose pas de limite équivalente. Constat de cohérence établi par lecture du code et calcul ; aucun transfert de fichier maximal à travers le Nginx de production n'a été tenté.
- La réservation Checkout expire après 90 s et sa libération ne vérifie pas l'identité du détenteur. Une opération Stripe très lente peut dépasser ce délai et croiser une nouvelle réservation. Risque établi par lecture du code ; dépassement de 90 s et crash de processus non reproduits ici.

Sur mobile, le message de sauvegarde du brouillon est aussi masqué par `.editor-save > span { display: none; }`. Le brouillon était bien gardé, mais son état n'est plus communiqué dans cette vue. Les animations qui semblaient bloquées dans le serveur de développement fonctionnaient dans le build de production : elles ne sont pas classées comme un bug confirmé.

**Preuves et reproduction**

Les sondes consignent les comportements observés, y compris les bugs : leur sortie réussie ne signifie pas que tous ces comportements sont corrects. Elles n'ont pas été ajoutées à la CI comme tests de régression bloquants ; les convertir lors des corrections avec les assertions de comportement attendu.

Depuis `/Users/xaviergerinette/SQuizz/squizz`, avec un runtime Node compatible et PostgreSQL local :

```sh
bash scripts/e2e.sh audit-depth
```

La commande utilise la base jetable `squizz_e2e` et le simulateur Stripe, recrée cette base, exécute les sondes puis arrête le serveur. La sonde de panne ajoute un trigger temporaire uniquement dans cette base et le retire dans un `finally`. [Sonde principale](/Users/xaviergerinette/SQuizz/squizz/audit/audit-depth.py), [panne de persistance](/Users/xaviergerinette/SQuizz/squizz/audit/billing-interruption.py), [résultats](/Users/xaviergerinette/SQuizz/squizz/audit/results.json), [contrôles de production locale](/Users/xaviergerinette/SQuizz/squizz/audit/production-results.json).

Le test de restauration conserve explicitement `squizz_e2e` comme source et utilise une seconde base jetable : [script](/Users/xaviergerinette/SQuizz/squizz/audit/restore-check.py). Les scripts complémentaires enregistrent leurs résultats dans `/tmp`. Les ports 5174/5175 sont ceux du workflow isolé ; le contrôle de production locale utilisait 5190.

Capture du parcours mobile réussi :

![Quiz enregistré sur mobile](/Users/xaviergerinette/SQuizz/squizz/audit/mobile-save.jpg)

**Limites du périmètre**

Pas d'audit du VPS réel, de sa configuration Nginx/TLS active, des droits de ses fichiers, de sa copie NAS, de ses sauvegardes réelles ni d'une restauration complète base + médias. La restauration locale confirme PostgreSQL uniquement. Stripe, SMTP et Turnstile réels n'ont pas été sollicités. Pas de certification RGPD/accessibilité, de test iOS/Android sur appareils physiques ni de simulation exhaustive des coupures réseau. Les seuils de débit ont été vérifiés séparément dans le build local de production, car ils sont multipliés par 100 dans le workflow d'intégration.
