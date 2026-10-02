# Revue des corrections 1.10.7 — 2 octobre 2026

> **Mise à jour du 2 octobre 2026 : la reprise Stripe signalée ci-dessous est corrigée dans la version 1.10.8** (commit `32aa9f0`, déployée le même jour, migration `20261002400000_checkout_op_params`). La revue est conservée telle qu’elle a été rédigée sur la 1.10.7 ; une ligne « Corrigé en 1.10.8 » sous le point P2 résume la correction. La limite de validation de l’aperçu reste inchangée. Détail dans [CHANGELOG.md](CHANGELOG.md).

Révision examinée : dafd28a, corrections dans 4569458. Le code applicatif n'a pas été modifié pendant cette revue.

Les six défauts de l'audit sont traités dans le code. Vérifications indépendantes : 52 tests Vitest dans 19 fichiers, TypeScript et ESLint réussis ; les scénarios d'intégration billing, event-pass, monitoring et auth-hardening réussissent sur une copie isolée, avec une base locale dédiée, Stripe simulé et les e-mails désactivés.

## P2 — La reprise d'une opération de paiement peut changer les paramètres de sa clé Stripe

> **Corrigé en 1.10.8.** `openCheckoutPage` (`lib/server/billing.ts`), commun au pack et à l’abonnement, écrit l’opération avant d’appeler Stripe : sa clé (`checkoutOpKey`) et les paramètres exacts envoyés (`checkoutOpParams`, expiration comprise). Une reprise renvoie cette même demande ; la page rendue est relue et, si elle a expiré ou a été payée, une nouvelle opération démarre avec une nouvelle clé. La clé n’est pas renouvelée sur un simple doute réseau, seulement si Stripe a mémorisé son propre échec ou refuse définitivement la demande. Le faux Stripe rejoue la première réponse telle quelle, refuse une clé dont les paramètres ont changé et impose la durée minimale d’une page. Tests panne → expiration → nouvelle tentative et échec Stripe → nouvelle tentative dans `tests/event-pass.py` et `tests/billing.py` : ils échouent sur le code 1.10.7 (HTTP 500 à la reprise) et passent ensuite. Limites : une opération n’est rejouée qu’environ 45 secondes après la première tentative (au-delà, nouvelle opération, les pages ouvertes étant cherchées avant) ; la réponse 409 de Stripe (clé encore en cours de traitement) n’est pas simulée ; validation contre le faux Stripe uniquement, pas par un achat réel.

Dans lib/server/billing.ts, buyEventPass conserve checkoutOpKey mais recalcule expires_at à chaque appel (ligne 361). Une reprise portant la même clé peut donc avoir des paramètres différents. Stripe refuse ce cas : https://docs.stripe.com/api/idempotent_requests .

Reproduction indépendante sur /private/tmp/squizz-review-1107 : rendre le faux Stripe strict en mémorisant le corps de la première requête par clé et en retournant une erreur idempotency_error si le corps suivant diffère. Dans le scénario event-pass, après la panne SQL qui empêche d'effacer checkoutOpKey, expirer la page créée, attendre deux secondes, puis relancer l'achat. Résultat : HTTP 500 au lieu de 200. Le code n'atteint pas le contrôle retrieve(session.id) qui aurait permis de démarrer une nouvelle opération.

Le faux Stripe actuel (tests/stripe_mock.py:99) retourne directement le premier résultat pour une clé connue sans comparer les paramètres : il masque ce défaut. Le parcours abonnement recalcule également expires_at avec une clé durable ; il faut examiner la même garantie dans ce parcours.

Correction attendue : conserver durablement les paramètres de création d'une opération, notamment sa date d'expiration, et les rejouer à l'identique. Quand la session précédente est terminée, créer une nouvelle opération avec une nouvelle clé. Renforcer le faux Stripe et ajouter le scénario panne → expiration → nouvelle tentative. Ne pas renouveler arbitrairement la clé lors d'un simple doute réseau, sous peine de perdre la protection contre les doublons.

## Limite de la validation de l'aperçu

Les deux protections React attendues sont présentes (stopPropagation côté réponse et filtrage target/currentTarget côté éditeur). Le test forms.spec.ts vérifie des chaînes dans le code source ; il n'exécute pas un navigateur. Le rapport mis à jour mentionne un contrôle manuel par Claude, mais cette revue n'a pas répété ce contrôle ni un build de production.

Conclusion : les corrections sont substantielles et leurs régressions passent, mais la reprise Stripe reste à corriger avant de considérer l'ensemble clos.
