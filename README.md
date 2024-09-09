# FHE2P (Fully Homomorphic Encryption 2-Party)

## Overview

FHE2P is a decentralized marketplace project that demonstrates the use of Fully Homomorphic Encryption (FHE) in a two-party system via the Fhenix protocol. It enables secure trading of encrypted vouchers, such as prepaid Visa cards, using stablecoins. FHE2P addresses challenges in P2P transactions, including government restrictions and the risks posed by centralized exchanges. Voucher data is stored securely on the Fhenix Chain, allowing users to redeem or resell their vouchers in a Web2 marketplace, creating a seamless and hybrid P2P experience.

## Features

- LocalFhenix integration for local testing
- Smart contract deployment to LocalFhenix
- Example tasks for interacting with deployed contracts
- Fully Homomorphic Encryption capabilities

## Prerequisites

- Node.js (v14.0.0 or later)
- pnpm
- Docker (for LocalFhenix)

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/FHE2P.git
   cd FHE2P
   ```

2. Install dependencies:
   ```
   pnpm install
   ```

## LocalFhenix Setup

To set up and run LocalFhenix for testing, follow these steps:

1. Clone the Fhenix Hardhat example repository in a separate folder:
   ```
   git clone https://github.com/fhenixprotocol/fhenix-hardhat-example.git
   cd fhenix-hardhat-example
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start LocalFhenix:
   ```
   npm run localfhenix:start
   ```

This will create a local Docker container for the testing environment.

4. To stop LocalFhenix when you're done:
   ```
   npm run localfhenix:stop
   ```

## Configuration

Instead of using a `.env` file, the necessary configuration values are declared directly in the `frontend/src/components/component.tsx` file:
