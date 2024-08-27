import Link from 'next/link'
import { Button } from "@/components/ui/button"

export function Navbar() {
  return (
    <nav className="bg-gray-800 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-xl font-bold">FHE Marketplace</Link>
        <div>
          <Button variant="outline" className="mr-2">Connect Wallet</Button>
          <Button>Sell Voucher</Button>
        </div>
      </div>
    </nav>
  )
}