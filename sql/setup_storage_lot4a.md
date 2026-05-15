# Setup Supabase Storage — Bucket logos-mairie-asso

## Étape 1 — Créer le bucket
1. Aller dans le dashboard Supabase → Storage → "New bucket"
2. Nom : `logos-mairie-asso`
3. Public bucket : OUI (la lecture des logos doit être publique pour l'affichage)
4. File size limit : 2 MB
5. Allowed MIME types : `image/png`, `image/jpeg`, `image/webp`
6. Cliquer "Create"

## Étape 2 — Configurer les policies RLS
Aller dans Storage → bucket "logos-mairie-asso" → "Policies", puis créer les 3 policies suivantes :

### Policy 1 — Lecture publique
- Name : `Lecture publique des logos`
- Operation : SELECT
- USING : `true`

### Policy 2 — Upload pour owner du mairie_asso
- Name : `Upload pour owner mairie/asso`
- Operation : INSERT
- WITH CHECK :
  ```sql
  bucket_id = 'logos-mairie-asso'
  AND EXISTS (
    SELECT 1 FROM commerces
    WHERE commerces.owner_id = auth.uid()
      AND commerces.categorie_bonmoment = 'mairie_asso'
      AND (storage.foldername(name))[1] = commerces.id::text
  )
  ```

### Policy 3 — Update pour owner du mairie_asso
- Name : `Update pour owner mairie/asso`
- Operation : UPDATE
- USING :
  ```sql
  bucket_id = 'logos-mairie-asso'
  AND EXISTS (
    SELECT 1 FROM commerces
    WHERE commerces.owner_id = auth.uid()
      AND commerces.categorie_bonmoment = 'mairie_asso'
      AND (storage.foldername(name))[1] = commerces.id::text
  )
  ```

### Policy 4 — Delete pour owner du mairie_asso
- Name : `Delete pour owner mairie/asso`
- Operation : DELETE
- USING :
  ```sql
  bucket_id = 'logos-mairie-asso'
  AND EXISTS (
    SELECT 1 FROM commerces
    WHERE commerces.owner_id = auth.uid()
      AND commerces.categorie_bonmoment = 'mairie_asso'
      AND (storage.foldername(name))[1] = commerces.id::text
  )
  ```

## Structure des chemins
Les logos seront stockés sous la forme :
`{mairie_asso_id}/logo.{ext}`

Exemple : `logos-mairie-asso/abc123-def-456/logo.png`

Cette structure garantit qu'un mairie_asso ne peut accéder qu'à son propre dossier
(vérifié par la policy via `storage.foldername(name)[1]`).

## Vérification post-setup
Après création du bucket et des policies :
1. Tester un upload via le dashboard commerçant avec un compte mairie_asso
2. Vérifier que le logo est accessible publiquement via l'URL retournée
3. Tester la suppression
