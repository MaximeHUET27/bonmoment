import Stripe from 'stripe'

export async function computeStripeMRR() {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('[computeStripeMRR] STRIPE_SECRET_KEY absent')
      return { ok: false, mrr: null, payingCount: 0, subs: [] }
    }

    const stripe  = new Stripe(process.env.STRIPE_SECRET_KEY)
    const allSubs = []
    let params    = { status: 'active', limit: 100 }

    // Auto-pagination
    for (;;) {
      const page = await stripe.subscriptions.list(params)
      allSubs.push(...page.data)
      if (!page.has_more) break
      params = { ...params, starting_after: page.data[page.data.length - 1].id }
    }

    let mrr      = 0
    const subs   = []

    for (const sub of allSubs) {
      let monthlyAmount = sub.items.data.reduce((sum, item) => {
        const price    = item.price
        const qty      = item.quantity ?? 1
        let amount     = (price.unit_amount / 100) * qty
        const interval = price.recurring?.interval
        if (interval === 'year') amount = amount / 12
        if (interval === 'week') amount = amount * (52 / 12)
        return sum + amount
      }, 0)

      // Coupon récurrent uniquement (duration 'once' = avoir ponctuel, non déduit du MRR)
      const coupon = sub.discount?.coupon
      if (coupon && coupon.duration !== 'once') {
        if (coupon.amount_off)       monthlyAmount = Math.max(0, monthlyAmount - coupon.amount_off / 100)
        else if (coupon.percent_off) monthlyAmount = monthlyAmount * (1 - coupon.percent_off / 100)
      }

      mrr += monthlyAmount
      subs.push({ created: sub.created, monthlyAmount })
    }

    return {
      ok:          true,
      mrr:         Math.round(mrr * 100) / 100,
      payingCount: allSubs.length,
      subs,
    }
  } catch (err) {
    console.error('[computeStripeMRR]', err?.message || err)
    return { ok: false, mrr: null, payingCount: 0, subs: [] }
  }
}
