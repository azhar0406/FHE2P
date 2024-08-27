'use client'

import { useEffect, useState } from 'react'
import VoucherCard from './VoucherCard'
import { getVouchers } from '@/lib/api'

export default function VoucherList() {
  const [vouchers, setVouchers] = useState([])

  useEffect(() => {
    const fetchVouchers = async () => {
      const data = await getVouchers()
      setVouchers(data)
    }
    fetchVouchers()
  }, [])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {vouchers.map((voucher) => (
        <VoucherCard key={voucher.id} voucher={voucher} />
      ))}
    </div>
  )
}