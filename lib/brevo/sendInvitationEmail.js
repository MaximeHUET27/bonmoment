/**
 * Envoie un email d'invitation à un commerçant pour rejoindre une mairie/asso.
 * Réutilise le pattern Brevo existant (clé BREVO_API_KEY, fetch direct).
 *
 * @param {object} params
 * @param {string} params.commerceEmail - Email du destinataire (commerçant)
 * @param {string} params.commercePrenom - Prénom affiché dans l'email
 * @param {string} params.assoNom - Nom de la mairie/asso qui invite
 * @returns {Promise<{success: boolean, error?: string}>}
 */
import { BREVO_SENDER, BREVO_REPLY_TO } from '@/lib/brevo/sender'

export async function sendInvitationEmail({ commerceEmail, commercePrenom, assoNom }) {
  if (!process.env.BREVO_API_KEY) {
    console.error('[Brevo] BREVO_API_KEY manquante');
    return { success: false, error: 'BREVO_API_KEY non configurée' };
  }

  if (!commerceEmail || !assoNom) {
    return { success: false, error: 'Paramètres manquants' };
  }

  const dashboardUrl = 'https://bonmoment.app/commercant/dashboard';

  const payload = {
    sender: BREVO_SENDER,
    to: [{ email: commerceEmail, name: commercePrenom || '' }],
    replyTo: BREVO_REPLY_TO,
    subject: `${assoNom} t'invite à rejoindre ses adhérents sur BONMOMENT`,
    htmlContent: `
      <div style="font-family: 'Montserrat', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #3D3D3D; line-height: 1.6;">
        <div style="background: #FF6B00; padding: 24px; text-align: center;">
          <h1 style="color: #FFFFFF; font-size: 28px; margin: 0; font-weight: 700;">BONMOMENT</h1>
        </div>
        <div style="padding: 32px 24px; background: #FFFFFF;">
          <h2 style="color: #0A0A0A; font-size: 20px; font-weight: 600; margin-top: 0;">Salut ${commercePrenom || ''} 👋</h2>
          <p style="font-size: 16px;">Bonne nouvelle ! <strong>${assoNom}</strong> vient de t'inviter à rejoindre ses adhérents sur BONMOMENT.</p>
          <p style="font-size: 16px;">En acceptant, tu pourras valider les bons de leurs offres dans ton commerce et apparaître sur la liste de leurs membres.</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${dashboardUrl}" style="display: inline-block; background: #FF6B00; color: #FFFFFF; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 700; font-size: 16px;">Voir l'invitation</a>
          </div>
          <p style="font-size: 14px; color: #3D3D3D;">Tu peux accepter ou décliner l'invitation depuis ton dashboard. À bientôt sur BONMOMENT !</p>
        </div>
        <div style="padding: 16px; background: #F5F5F5; text-align: center; font-size: 12px; color: #3D3D3D;">
          BONMOMENT — bonmoment.app — Soyez là au bon moment
        </div>
      </div>
    `,
  };

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Brevo] Échec envoi invitation:', response.status, errorText);
      return { success: false, error: `Brevo ${response.status}` };
    }

    return { success: true };
  } catch (error) {
    console.error('[Brevo] Exception envoi invitation:', error);
    return { success: false, error: error.message };
  }
}
