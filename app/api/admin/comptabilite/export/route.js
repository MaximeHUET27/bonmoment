import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

const ADMIN_EMAIL = 'bonmomentapp@gmail.com'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function genCSV(headers, rows) {
  return [headers, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\n')
}

async function genPDF(titre, headers, rows) {
  const pdfDoc = await PDFDocument.create()
  const font   = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontB  = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const orange = rgb(1, 0.42, 0)
  const dark   = rgb(0.15, 0.15, 0.15)
  const gray   = rgb(0.5, 0.5, 0.5)

  let page = pdfDoc.addPage([842, 595]) // A4 paysage
  let y = 560

  // Titre
  page.drawText(titre, { x: 40, y, size: 16, font: fontB, color: orange })
  y -= 30

  // En-têtes
  const colW = Math.min(120, (762) / headers.length)
  headers.forEach((h, i) => {
    page.drawText(h, { x: 40 + i * colW, y, size: 9, font: fontB, color: dark })
  })
  y -= 5
  page.drawLine({ start: { x: 40, y }, end: { x: 802, y }, thickness: 0.5, color: orange })
  y -= 14

  for (const row of rows) {
    if (y < 40) {
      page = pdfDoc.addPage([842, 595])
      y = 560
    }
    row.forEach((v, i) => {
      const text = String(v ?? '').substring(0, 20)
      page.drawText(text, { x: 40 + i * colW, y, size: 8, font, color: dark })
    })
    y -= 13
    page.drawLine({ start: { x: 40, y: y + 2 }, end: { x: 802, y: y + 2 }, thickness: 0.3, color: rgb(0.9, 0.9, 0.9) })
  }

  // Footer
  const pages = pdfDoc.getPages()
  pages.forEach((p, idx) => {
    p.drawText(`Page ${idx + 1}/${pages.length} — BONMOMENT`, { x: 40, y: 20, size: 7, font, color: gray })
  })

  return await pdfDoc.save()
}

export async function POST(request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user)
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  if (user.email !== ADMIN_EMAIL)
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { type, debut, fin } = await request.json()

  const debutStr = debut || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]
  const finStr   = fin   || new Date().toISOString().split('T')[0]

  if (type === 'recettes_csv' || type === 'recettes_pdf') {
    const { data } = await admin
      .from('recettes')
      .select('*')
      .gte('date', debutStr)
      .lte('date', finStr)
      .order('date', { ascending: false })

    const headers = ['Date', 'Commerce', 'HT (€)', 'TVA (€)', 'TTC (€)', 'Statut', 'N° Facture']
    const rows = (data ?? []).map(r => [r.date, r.commerce_nom, r.montant_ht, r.montant_tva, r.montant_ttc, r.statut, r.numero_facture || ''])

    if (type === 'recettes_csv') {
      const csv = genCSV(headers, rows)
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="recettes_${debutStr}_${finStr}.csv"`,
        },
      })
    } else {
      const pdfBytes = await genPDF(`Recettes du ${debutStr} au ${finStr}`, headers, rows)
      return new Response(pdfBytes, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="recettes_${debutStr}_${finStr}.pdf"`,
        },
      })
    }
  }

  if (type === 'charges_csv' || type === 'charges_pdf') {
    const { data } = await admin
      .from('charges')
      .select('*')
      .gte('date', debutStr)
      .lte('date', finStr)
      .order('date', { ascending: false })

    const headers = ['Date', 'Fournisseur', 'Description', 'Catégorie', 'HT (€)', 'TVA (€)', 'TTC (€)']
    const rows = (data ?? []).map(r => [r.date, r.fournisseur, r.description || '', r.categorie, r.montant_ht, r.montant_tva, r.montant_ttc])

    if (type === 'charges_csv') {
      const csv = genCSV(headers, rows)
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="charges_${debutStr}_${finStr}.csv"`,
        },
      })
    } else {
      const pdfBytes = await genPDF(`Charges du ${debutStr} au ${finStr}`, headers, rows)
      return new Response(pdfBytes, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="charges_${debutStr}_${finStr}.pdf"`,
        },
      })
    }
  }

  if (type === 'tva_pdf') {
    const [{ data: recettes }, { data: charges }] = await Promise.all([
      admin.from('recettes').select('montant_tva, date, commerce_nom').eq('statut', 'payee').gte('date', debutStr).lte('date', finStr),
      admin.from('charges').select('montant_tva, montant_ht, taux_tva, autoliquidation, date, fournisseur').gte('date', debutStr).lte('date', finStr),
    ])
    const tva_collectee  = (recettes ?? []).reduce((s, r) => s + Number(r.montant_tva), 0)
    const tva_deductible = (charges ?? []).filter(c => !c.autoliquidation).reduce((s, c) => s + Number(c.montant_tva), 0)
    const tva_autoliq    = (charges ?? []).filter(c => c.autoliquidation).reduce((s, c) => s + Number(c.montant_ht) * Number(c.taux_tva) / 100, 0)
    const tva_nette      = tva_collectee - tva_deductible

    const headers = ['Élément', 'Montant (€)']
    const rows = [
      ['TVA collectée', tva_collectee.toFixed(2)],
      ['TVA déductible', tva_deductible.toFixed(2)],
      ['TVA autoliquidée (info)', tva_autoliq.toFixed(2)],
      ['TVA NETTE À PAYER', tva_nette.toFixed(2)],
    ]
    const pdfBytes = await genPDF(`Relevé TVA du ${debutStr} au ${finStr}`, headers, rows)
    return new Response(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="tva_${debutStr}_${finStr}.pdf"`,
      },
    })
  }

  // TODO: dossier_annuel (zip avec archiver)
  return NextResponse.json({ error: `Type '${type}' non supporté` }, { status: 400 })
}
