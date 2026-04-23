# Traitement n°7 — Fidélité universelle

*À ajouter au registre-traitements-CNIL.docx*

---

## Fiche de traitement

| Paramètre | Détail |
|-----------|--------|
| **Numéro du traitement** | 7 |
| **Intitulé** | Fidélité universelle BONMOMENT |
| **Finalité** | Gestion des cartes de fidélité universelles permettant aux clients d'accumuler des tampons chez les commerçants BONMOMENT Pro et de bénéficier de récompenses lors du franchissement d'un seuil de passages |
| **Base légale** | Exécution du contrat (art. 6.1.b RGPD) pour les clients BONMOMENT ayant activé la carte depuis leur profil ; intérêt légitime du responsable de traitement et consentement verbal recueilli par le commerçant (art. 6.1.a et 6.1.f RGPD) pour les profils légers (users_light) enregistrés en caisse sans compte BONMOMENT |
| **Co-responsabilité** | BONMOMENT (responsable principal) et commerçant partenaire Pro (co-responsable pour les données collectées en caisse) — art. 26 RGPD |
| **Catégories de personnes concernées** | (1) Clients BONMOMENT ayant activé leur carte fidélité depuis leur profil ; (2) Clients enregistrés par un commerçant en caisse sans compte BONMOMENT (users_light) |
| **Données traitées** | Numéro de téléphone français (06/07) ; prénom optionnel (users_light uniquement) ; historique des passages fidélité (date, mode d'identification, nombre de tampons) ; compteurs de tampons en cours de cycle ; nombre de récompenses débloquées ; indicateur de récompense en attente de remise |
| **Destinataires** | Supabase Inc. (hébergement et stockage, UE — région eu-central-1) ; Vercel Inc. (hébergement applicatif) ; commerçant partenaire Pro concerné (accès limité via RLS Supabase aux données de ses propres clients fidélité uniquement) |
| **Transferts hors UE** | Vercel Inc. (États-Unis) — encadré par les Clauses Contractuelles Types (CCT) adoptées par la Commission Européenne |
| **Durée de conservation** | 13 mois à compter de la dernière activité (dernier passage validé ou dernière modification de la carte). En cas de désactivation volontaire par le client : suppression immédiate de l'ensemble des cartes et de l'historique associé. Profils users_light inactifs depuis plus de 13 mois : purge automatique. |
| **Mesures de sécurité techniques et organisationnelles** | RLS (Row Level Security) Supabase strict : le client ne peut accéder qu'à ses propres cartes, le commerçant qu'aux données de ses clients fidélité ; RPCs PostgreSQL en mode SECURITY DEFINER avec vérifications d'ownership internes ; rate limiting applicatif anti-fraude sur les endpoints de validation ; chiffrement en transit (HTTPS/TLS 1.3) ; serveurs localisés dans l'Union Européenne (région eu-central-1) ; séparation client Supabase session / client admin service_role selon le niveau d'opération |
| **Droit d'opposition / exercice des droits** | Point de contact désigné : BONMOMENT — bonmomentapp@gmail.com. Les demandes relatives à un commerçant précis sont transmises à celui-ci dans un délai d'un mois. |
| **Date de création de la fiche** | Avril 2026 |
| **Dernière mise à jour** | Avril 2026 |

---

## Notes complémentaires

**Fusion de profils :** lorsqu'un porteur d'un profil user_light crée un compte BONMOMENT avec le même numéro de téléphone, la fusion est automatique et transparente (RPC `activer_carte_fidelite`). Le profil user_light est alors remplacé par le compte client BONMOMENT ; les tampons et l'historique sont intégralement conservés.

**Ajustements manuels :** les commerçants Pro disposent d'une fonctionnalité d'ajustement manuel des tampons (correction d'erreurs). Tout ajustement est tracé en mode `manuel` dans la table `passages_fidelite` avec un commentaire obligatoire, permettant l'auditabilité complète.

**Annulation de passage :** les passages peuvent être annulés par le commerçant dans un délai court. Les lignes annulées sont conservées avec le flag `annule = true` (traçabilité) mais exclues de tous les calculs et affichages.

---

*À copier-coller dans le document .docx correspondant après relecture.*
