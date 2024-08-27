import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function VoucherCard({ voucher }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{voucher.type}</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Value: ${voucher.value}</p>
        <p>Price: ${voucher.price}</p>
      </CardContent>
      <CardFooter>
        <Button>Buy Now</Button>
      </CardFooter>
    </Card>
  )
}