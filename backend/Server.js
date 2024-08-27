const express = require('express')
const cors = require('cors')

const app = express()
const port = 3001

app.use(cors())
app.use(express.json())

// Mock data for vouchers
const vouchers = [
  { id: 1, type: 'Visa Prepaid', value: 100, price: 95 },
  { id: 2, type: 'Amazon Gift Card', value: 50, price: 48 },
  { id: 3, type: 'iTunes Gift Card', value: 25, price: 23 },
]

app.get('/vouchers', (req, res) => {
  res.json(vouchers)
})

app.listen(port, () => {
  console.log(`Backend API running on http://localhost:${port}`)
})