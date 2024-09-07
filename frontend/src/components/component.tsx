"use client";

import { useState, useEffect, useRef } from "react"
import { ethers } from "ethers"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"

declare global {
  interface Window {
    ethereum: any;
  }
}

// const FHENIX_CHAIN_ID = "0x7A2BE7" // 0x7A2BE7 8008135 in hexadecimal 

const FHENIX_CHAIN_ID = "0x7A31C7" // 8006631 in hexadecimal 

export default function Component() {
  const [walletAddress, setWalletAddress] = useState("")
  const [isConnected, setIsConnected] = useState(false)
  const [isCorrectChain, setIsCorrectChain] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    checkConnection()
    if (typeof window.ethereum !== "undefined") {
      window.ethereum.on("accountsChanged", checkConnection)
      window.ethereum.on("chainChanged", checkConnection)
    }
    return () => {
      if (typeof window.ethereum !== "undefined") {
        window.ethereum.removeListener("accountsChanged", checkConnection)
        window.ethereum.removeListener("chainChanged", checkConnection)
      }
    }
  }, [])

  const checkConnection = async () => {
    if (typeof window.ethereum !== "undefined") {
      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum)
        const accounts = await provider.listAccounts()
        if (accounts.length > 0) {
          setWalletAddress(accounts[0])
          setIsConnected(true)
          const network = await provider.getNetwork()
          setIsCorrectChain(network.chainId === parseInt(FHENIX_CHAIN_ID, 16))
        } else {
          setWalletAddress("")
          setIsConnected(false)
          setIsCorrectChain(false)
        }
      } catch (error) {
        console.error("Failed to check connection:", error)
        setWalletAddress("")
        setIsConnected(false)
        setIsCorrectChain(false)
      }
    }
  }

  const connectWallet = async () => {
    if (typeof window.ethereum !== "undefined") {
      try {
        await window.ethereum.request({ method: "eth_requestAccounts" })
        await checkConnection()
        if (!isCorrectChain) {
          await switchToFhenixNetwork()
        }
      } catch (error) {
        console.error("Failed to connect wallet:", error)
      }
    } else {
      alert("Please install MetaMask!")
    }
  }

  const switchToFhenixNetwork = async () => {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: FHENIX_CHAIN_ID }],
      })
      await checkConnection() // Add this line to recheck the connection after switching
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: FHENIX_CHAIN_ID,
                chainName: "Fhenix Network",
                nativeCurrency: {
                  name: "tFHE",
                  symbol: "tFHE",
                  decimals: 18,
                },
                rpcUrls: ["https://api.helium.fhenix.zone"],
                blockExplorerUrls: ["https://explorer.helium.fhenix.zone"],
              },
            ],
          })
          await checkConnection() // Add this line to recheck the connection after adding the network
        } catch (addError) {
          console.error("Failed to add the Fhenix network:", addError)
        }
      } else {
        console.error("Failed to switch to the Fhenix network:", switchError)
      }
    }
  }

  const disconnectWallet = () => {
    setWalletAddress("")
    setIsConnected(false)
    setIsCorrectChain(false)
    setIsDropdownOpen(false)
  }

  const getButtonText = () => {
    if (!isConnected) return "Connect Wallet"
    if (!isCorrectChain) return "Switch to Fhenix Network"
    return `Connected: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
  }

  const handleButtonClick = async () => {
    if (!isConnected) {
      await connectWallet()
    } else if (!isCorrectChain) {
      await switchToFhenixNetwork()
    } else {
      setIsDropdownOpen(!isDropdownOpen)
    }
  }


  return (
    <div className="min-h-screen bg-white font-inter">
    <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white border-b">
      <div className="flex items-center space-x-4">
          <FigmaIcon className="w-8 h-8" />
          <Input type="search" placeholder="Search for collections, NFTs or users" className="w-64" />
        </div>
        <nav className="flex items-center space-x-4">
          <Link href="#" className="font-bold" prefetch={false}>
            Create
          </Link>
          <Link href="#" className="font-bold" prefetch={false}>
            Explore
          </Link>
          <Link href="#" className="font-bold" prefetch={false}>
            Sell
          </Link>
          <Link href="#" className="font-bold" prefetch={false}>
            Drops
          </Link>
          <div className="relative" ref={dropdownRef}>
            <Button
              variant="outline"
              className="ml-4 bg-black text-white"
              onClick={handleButtonClick}
            >
              {getButtonText()}
            </Button>
            {isConnected && isCorrectChain && isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                  <button
                    onClick={disconnectWallet}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 w-full text-left"
                    role="menuitem"
                  >
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </nav>
      </header>
      <div className="bg-white p-8 rounded-lg text-[#108849] text-3xl flex flex-col items-center justify-center gap-4 pt-20 pb-8">
        <h1 className="text-[#108849] text-4xl font-normal">Enjoy instant discount</h1>
        <h1 className="flex items-center text-black text-4xl font-normal mb-4">
          on 400+ brands with <GiftIcon className="inline-block w-6 h-6 mr-2" />
          Gift Cards
        </h1>
        <div className="flex items-center gap-4">
          <Button variant="solid" className="bg-black text-white px-6 py-3 rounded-full">
            Explore Brands
          </Button>
          <Button
            variant="solid"
            className="bg-white text-black px-6 py-3 rounded-full hover:bg-gray-200 hover:text-black border border-gray-300"
          >
            What's Gift Card?
          </Button>
        </div>
      </div>
      <main className="px-6 py-8">
        <section className="mb-8">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, idx) => (
              <Card key={idx}>
                <img
                  src="/placeholder.svg"
                  alt="NFT"
                  className="w-full h-48 rounded-t-lg"
                  width="200"
                  height="200"
                  style={{ aspectRatio: "200/200", objectFit: "cover" }}
                />
                <CardContent>
                  <p className="text-sm font-bold">NFT Title {idx + 1}</p>
                  <p className="text-sm">Buy Now</p>
                  <div className="flex items-center">
                    <span className="text-sm mr-2">Price:</span>
                    <span className="text-sm font-bold">$25.00 USDT</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="flex justify-center mt-4">
            <Button variant="link" className="bg-gray-300 px-8 py-4 rounded-lg">
              View all drops
            </Button>
          </div>
        </section>
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Trending</h2>
            <div className="flex items-center space-x-2">
              <Button variant="outline">1H</Button>
              <Button variant="outline">1D</Button>
              <Button variant="outline">7D</Button>
              <Button variant="outline">30D</Button>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Collection</TableHead>
                <TableHead>Floor Price</TableHead>
                <TableHead>Floor Change</TableHead>
                <TableHead>Volume</TableHead>
                <TableHead>Volume Change</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Owners</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 7 }).map((_, idx) => (
                <TableRow key={idx}>
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <img
                        src="/placeholder.svg"
                        alt={`Collection ${idx + 1}`}
                        className="w-10 h-10 rounded-full"
                        width="40"
                        height="40"
                        style={{ aspectRatio: "40/40", objectFit: "cover" }}
                      />
                      <span>Collection {idx + 1}</span>
                    </div>
                  </TableCell>
                  <TableCell>$25.00 USDT</TableCell>
                  <TableCell>+1.3%</TableCell>
                  <TableCell>$1,572.00 USDT</TableCell>
                  <TableCell>—</TableCell>
                  <TableCell>3.1K</TableCell>
                  <TableCell>2.2K</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex justify-center mt-4">
            <Button variant="link" className="bg-gray-300 px-8 py-4 rounded-lg">
              View all collections
            </Button>
          </div>
        </section>
      </main>
      <footer className="bg-black text-white py-4 px-6 flex justify-between items-center">
        <p className="text-sm">&copy; 2024 FHE2P. All rights reserved.</p>
        <nav className="flex items-center space-x-4">
          <Link href="#" className="text-sm hover:text-gray-300" prefetch={false}>
            Terms of Service
          </Link>
          <Link href="#" className="text-sm hover:text-gray-300" prefetch={false}>
            Privacy Policy
          </Link>
        </nav>
      </footer>
    </div>
  )
}

function FigmaIcon(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 5.5A3.5 3.5 0 0 1 8.5 2H12v7H8.5A3.5 3.5 0 0 1 5 5.5z" />
      <path d="M12 2h3.5a3.5 3.5 0 1 1 0 7H12V2z" />
      <path d="M12 12.5a3.5 3.5 0 1 1 7 0 3.5 3.5 0 1 1-7 0z" />
      <path d="M5 19.5A3.5 3.5 0 0 1 8.5 16H12v3.5a3.5 3.5 0 1 1-7 0z" />
      <path d="M5 12.5A3.5 3.5 0 0 1 8.5 9H12v7H8.5A3.5 3.5 0 0 1 5 12.5z" />
    </svg>
  )
}

function GiftIcon(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M12 8v13" />
      <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
      <path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5" />
    </svg>
  )
}