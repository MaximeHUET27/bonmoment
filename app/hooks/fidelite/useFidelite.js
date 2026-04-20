'use client'

/**
 * Hook React — Carte Fidélité Universelle
 *
 * MUTATIONS  → appels fetch() vers les API routes Next.js (Commit 3).
 *              Même pattern que l'existant /api/valider-bon :
 *              POST JSON, réponse { success, ... } ou { error }.
 *
 * LECTURES   → SELECT direct via client Supabase (RLS suffit pour ces opérations
 *              read-only : le client ne voit que ses propres données, le commerçant
 *              que les données de son commerce).
 *
 * Import Supabase : @/lib/supabase/client (chemin réel du projet, pas @/app/lib/...)
 */

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

// Instance unique — même pattern que AuthContext
const supabase = createClient()

export function useFidelite() {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  // ── Helper interne fetch ────────────────────────────────────────────────────
  // Reproduit exactement le pattern de ValiderPage → fetch('/api/valider-bon')
  async function callApi(endpoint, body) {
    const res = await fetch(endpoint, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error || `Erreur serveur (${res.status})`)
    }
    return data
  }

  // ── MUTATIONS (via API routes — service_role côté serveur) ──────────────────
  // Les routes seront créées au Commit 3.
  // Les endpoints sont figés ici pour être cohérents avec les routes à venir.

  /**
   * Enregistre un passage (tampons) pour un client.
   * Gère les 3 modes d'identification : 'qr', 'code_6', 'telephone'.
   * Avec p_mode_consultation=true : lecture pure, aucun tampon ajouté.
   *
   * @param {object} p
   * @param {string}  p.commerceId
   * @param {'qr'|'code_6'|'telephone'} p.mode
   * @param {string}  p.identifierValue    - reservation_id, code 6 chiffres, ou 06/07
   * @param {string}  [p.prenomOptionnel]  - prénom pour création user_light
   * @param {boolean} [p.modeConsultation] - true = lecture sans écriture
   * @param {number}  [p.nbTampons]        - nombre de tampons (1 par défaut, max 10)
   * @returns {Promise<object>} résultat de la RPC enregistrer_passage_fidelite
   */
  const enregistrerPassage = useCallback(async (p) => {
    setLoading(true)
    setError(null)
    try {
      return await callApi('/api/fidelite/enregistrer-passage', {
        commerce_id:          p.commerceId,
        mode_identification:  p.mode,
        identifier_value:     p.identifierValue,
        prenom_optionnel:     p.prenomOptionnel  ?? null,
        mode_consultation:    p.modeConsultation ?? false,
        nb_tampons:           p.nbTampons        ?? 1,
      })
    } catch (e) {
      setError(e.message)
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Annule un passage entier (tous les tampons du groupe passage_group_id).
   * Restaure le bon validé si applicable.
   *
   * @param {string} passageGroupId - UUID retourné dans passage_id par enregistrerPassage
   */
  const annulerPassage = useCallback(async (passageGroupId) => {
    setLoading(true)
    setError(null)
    try {
      return await callApi('/api/fidelite/annuler-passage', {
        passage_group_id: passageGroupId,
      })
    } catch (e) {
      setError(e.message)
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Confirme qu'une récompense a été physiquement remise au client.
   * Passe recompense_en_attente à false sur la carte.
   *
   * @param {string} carteId
   */
  const confirmerRecompenseRemise = useCallback(async (carteId) => {
    setLoading(true)
    setError(null)
    try {
      return await callApi('/api/fidelite/confirmer-recompense', {
        carte_id: carteId,
      })
    } catch (e) {
      setError(e.message)
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Ajustement manuel de tampons par le commerçant (±50 max).
   * Crée une ligne passages_fidelite en mode 'manuel' pour la traçabilité.
   *
   * @param {object} p
   * @param {string} p.carteId
   * @param {number} p.nbTampons   - positif ou négatif
   * @param {string} p.commentaire - obligatoire pour la traçabilité
   */
  const ajusterTamponsManuel = useCallback(async ({ carteId, nbTampons, commentaire }) => {
    setLoading(true)
    setError(null)
    try {
      return await callApi('/api/fidelite/ajuster-tampons', {
        carte_id:    carteId,
        nb_tampons:  nbTampons,
        commentaire,
      })
    } catch (e) {
      setError(e.message)
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Lie un numéro 06/07 au compte BONMOMENT du client connecté.
   * Fusionne automatiquement les cartes user_light existantes sur ce numéro.
   *
   * @param {string} telephone - format libre, normalisé côté serveur
   */
  const activerCarte = useCallback(async (telephone) => {
    setLoading(true)
    setError(null)
    try {
      return await callApi('/api/fidelite/activer-carte', { telephone })
    } catch (e) {
      setError(e.message)
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Change le numéro de téléphone lié au compte client.
   * Fusionne les cartes user_light existantes sur le nouveau numéro.
   *
   * @param {string} nouveauTelephone
   */
  const modifierTelephone = useCallback(async (nouveauTelephone) => {
    setLoading(true)
    setError(null)
    try {
      return await callApi('/api/fidelite/modifier-telephone', {
        nouveau_telephone: nouveauTelephone,
      })
    } catch (e) {
      setError(e.message)
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Désactive complètement la fidélité pour le client connecté (RGPD).
   * Supprime toutes ses cartes et efface son numéro de téléphone.
   */
  const desactiverFidelite = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      return await callApi('/api/fidelite/desactiver', {})
    } catch (e) {
      setError(e.message)
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Crée ou met à jour le programme fidélité d'un commerce.
   * Option A : une baisse de seuil débloque immédiatement les clients éligibles.
   *
   * @param {object} p
   * @param {string}      p.commerceId
   * @param {number}      p.seuilPassages        - entre 3 et 50
   * @param {string}      p.descriptionRecompense
   * @param {boolean}     p.actif
   * @param {string|null} [p.regleTampons]       - ex: "1 tampon par tranche de 50€"
   */
  const mettreAJourProgramme = useCallback(async ({
    commerceId,
    seuilPassages,
    descriptionRecompense,
    actif,
    regleTampons = null,
  }) => {
    setLoading(true)
    setError(null)
    try {
      return await callApi('/api/fidelite/programme', {
        commerce_id:           commerceId,
        seuil_passages:        seuilPassages,
        description_recompense: descriptionRecompense,
        actif,
        regle_tampons:         regleTampons,
      })
    } catch (e) {
      setError(e.message)
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  // ── LECTURES (SELECT direct Supabase — RLS suffit) ──────────────────────────

  /**
   * Retourne toutes les cartes fidélité du client avec les infos du commerce.
   * Utilisé côté profil client.
   *
   * @param {string} userId - UUID auth
   */
  const getCartesClient = useCallback(async (userId) => {
    const { data, error: err } = await supabase
      .from('cartes_fidelite')
      .select(`
        id,
        commerce_id,
        client_type,
        seuil_passages_carte,
        description_recompense_carte,
        nb_passages_total,
        nb_passages_depuis_derniere_recompense,
        nb_recompenses_debloquees,
        recompense_en_attente,
        derniere_activite,
        created_at,
        commerces(id, nom, photo_url, ville)
      `)
      .eq('user_id', userId)
      .order('derniere_activite', { ascending: false })

    if (err) {
      const msg = `Impossible de charger les cartes fidélité : ${err.message}`
      setError(msg)
      throw new Error(msg)
    }
    return data
  }, [])

  /**
   * Retourne l'historique des passages non annulés d'une carte.
   * Limité aux 50 derniers pour les performances.
   *
   * @param {string} carteId
   */
  const getHistoriquePassages = useCallback(async (carteId) => {
    const { data, error: err } = await supabase
      .from('passages_fidelite')
      .select('id, mode_identification, passage_group_id, annule, created_at, commentaire')
      .eq('carte_fidelite_id', carteId)
      .eq('annule', false)
      .order('created_at', { ascending: false })
      .limit(50)

    if (err) {
      const msg = `Impossible de charger l'historique : ${err.message}`
      setError(msg)
      throw new Error(msg)
    }
    return data
  }, [])

  /**
   * Retourne la base client d'un commerce sur une période donnée.
   * Utilise la vue vue_base_client_fidelite (téléphones masqués, RLS commerce).
   *
   * @param {string} commerceId
   * @param {number} [periodeJours=30] - filtre sur derniere_activite
   */
  const getBaseClientCommerce = useCallback(async (commerceId, periodeJours = 30) => {
    const since = new Date(Date.now() - periodeJours * 86400000).toISOString()

    const { data, error: err } = await supabase
      .from('vue_base_client_fidelite')
      .select('*')
      .eq('commerce_id', commerceId)
      .gte('derniere_activite', since)
      .order('derniere_activite', { ascending: false })

    if (err) {
      const msg = `Impossible de charger la base client : ${err.message}`
      setError(msg)
      throw new Error(msg)
    }
    return data
  }, [])

  /**
   * Retourne uniquement les clients ayant une récompense en attente de remise.
   * Utilisé pour le badge et l'alerte du dashboard commerçant.
   *
   * @param {string} commerceId
   */
  const getClientsRecompenseEnAttente = useCallback(async (commerceId) => {
    const { data, error: err } = await supabase
      .from('vue_base_client_fidelite')
      .select('*')
      .eq('commerce_id', commerceId)
      .eq('recompense_en_attente', true)

    if (err) {
      const msg = `Impossible de charger les récompenses en attente : ${err.message}`
      setError(msg)
      throw new Error(msg)
    }
    return data
  }, [])

  /**
   * Retourne le programme fidélité d'un commerce (null si non configuré).
   *
   * @param {string} commerceId
   */
  const getProgramme = useCallback(async (commerceId) => {
    const { data, error: err } = await supabase
      .from('programmes_fidelite')
      .select('*')
      .eq('commerce_id', commerceId)
      .maybeSingle()

    if (err) {
      const msg = `Impossible de charger le programme : ${err.message}`
      setError(msg)
      throw new Error(msg)
    }
    return data
  }, [])

  /**
   * Supprime la carte fidélité d'un client (droit RGPD).
   * La policy RLS autorise uniquement le DELETE sur les cartes où user_id = auth.uid().
   *
   * @param {string} carteId
   */
  const supprimerCarteClient = useCallback(async (carteId) => {
    const { error: err } = await supabase
      .from('cartes_fidelite')
      .delete()
      .eq('id', carteId)

    if (err) {
      const msg = `Impossible de supprimer la carte : ${err.message}`
      setError(msg)
      throw new Error(msg)
    }
  }, [])

  // ── API publique du hook ────────────────────────────────────────────────────
  return {
    loading,
    error,
    // Mutations (→ API routes, Commit 3)
    enregistrerPassage,
    annulerPassage,
    confirmerRecompenseRemise,
    ajusterTamponsManuel,
    activerCarte,
    modifierTelephone,
    desactiverFidelite,
    mettreAJourProgramme,
    // Lectures (→ Supabase direct)
    getCartesClient,
    getHistoriquePassages,
    getBaseClientCommerce,
    getClientsRecompenseEnAttente,
    getProgramme,
    supprimerCarteClient,
  }
}
