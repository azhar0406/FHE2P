const API_URL = 'http://localhost:3001'

export async function getVouchers() {
  const response = await fetch(`${API_URL}/vouchers`)
  return response.json()
}

// Add more API functions as needed