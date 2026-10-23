'use client'

import Link from 'next/link'
import { useAuth } from '@/app/context/AuthContext'

import { isAdmin } from '@/lib/isAdmin'

export default function AdminFooterLink() {
  const { user } = useAuth()
  if (!user || !isAdmin(user)) return null
  return (
    <Link
      href="/admin"
      className="text-[11px] text-[#3D3D3D]/30 hover:text-[#FF6B00] transition-colors"
    >
      Admin ⚙
    </Link>
  )
}
