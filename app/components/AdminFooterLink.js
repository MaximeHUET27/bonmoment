'use client'

import Link from 'next/link'
import { useAuth } from '@/app/context/AuthContext'

const ADMIN_EMAIL = 'bonmomentapp@gmail.com'

export default function AdminFooterLink() {
  const { user } = useAuth()
  if (!user || user.email !== ADMIN_EMAIL) return null
  return (
    <Link
      href="/admin"
      className="text-[11px] text-[#3D3D3D]/30 hover:text-[#FF6B00] transition-colors"
    >
      Admin ⚙
    </Link>
  )
}
