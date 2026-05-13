BEGIN;
DROP FUNCTION IF EXISTS get_commercants_invitables(UUID, TEXT);
DROP FUNCTION IF EXISTS get_membres_mairie_asso(UUID);
DROP FUNCTION IF EXISTS get_invitations_et_adhesions_commerce(UUID);
COMMIT;
