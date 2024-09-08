"use client";

import { useState, useEffect, useRef } from "react";
import { ethers } from "ethers";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { RefreshCw } from 'lucide-react';


import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import contractABI from "../../public/fhe2p.json";

declare global {
  interface Window {
    ethereum: any;
  }
}

// const FHENIX_CHAIN_ID = "0x7A31C7" // 8006631 in hexadecimal

const FHENIX_CHAIN_ID = "0x64ABA"; // 8006631 in hexadecimal

const CONTRACT_ADDRESS = "0x4A9cAB3335B89deA01585994679f53c46BAB2E15";

const ERC20_ADDRESS = "0xbbB2AdFA0454e3FB438b9102CCc713c2E1D327a2";

interface VoucherMetadata {
  id: number;
  price: number;
  expirationDate: number;
  imageUrl: string;
  name: string;
}

export default function Component() {
  const [Fhenix, setFhenix] = useState<any>(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isCorrectChain, setIsCorrectChain] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [voucherMetadata, setVoucherMetadata] = useState<VoucherMetadata[]>([]);
  const [purchasedVouchers, setPurchasedVouchers] = useState<VoucherMetadata[]>([]);
  const [isRevealModalOpen, setIsRevealModalOpen] = useState(false);
  const [revealedVoucher, setRevealedVoucher] = useState<VoucherMetadata | null>(null);
  const [revealedCode, setRevealedCode] = useState<string | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);

  // useEffect(() => {
  //   import('@/../public/fhenix.esm.min.js').then(module => {
  //     console.log("Fhenix module:", module);
  //     setFhenix(module);
  //   }).catch(console.error);
  // }, []);

  useEffect(() => {
    fetchMyVouchers();
  }, [CONTRACT_ADDRESS, isConnected, isCorrectChain]);

  const refreshData = async () => {
    try {
      // Clear the state immediately
      setPurchasedVouchers([]);
      
      // Fetch new data
      await fetchMyVouchers();
      
      console.log("Vouchers refreshed successfully");
    } catch (error) {
      console.error("Error refreshing vouchers:", error);
    }
  };

  useEffect(() => {
    console.log("Purchased vouchers:", purchasedVouchers);
  }, [purchasedVouchers]);

  const fetchMyVouchers = async () => {
    if (typeof window.ethereum !== "undefined" && isConnected && isCorrectChain) {
      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);
  
        // Force a refresh of the account's state
        await provider.send("eth_requestAccounts", []);
  
        const myVouchers = await contract.getMyVouchers();
        console.log("Fetched vouchers:", myVouchers);
        setPurchasedVouchers(myVouchers.map((voucher: any) => ({
          id: voucher.voucherId.toNumber(),
          price: voucher.price.toNumber(),
          expirationDate: voucher.expiryDate,
          imageUrl: voucher.imageUrl,
          name: voucher.description,
        })));
      } catch (error) {
        console.error("Failed to fetch my vouchers:", error);
      }
    }
  };

  const handleRevealVoucherClick = async (voucher: VoucherMetadata) => {
    if (typeof window.ethereum !== "undefined" && isConnected && isCorrectChain) {
      try {
        setIsRevealing(true);
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);

        // First, call the revealVoucher function to mark the voucher as revealed
        console.log("Calling revealVoucher...");
        const revealTx = await contract.revealVoucher(voucher.id);
        
        // Wait for the transaction to be mined
        console.log("Waiting for transaction to be mined...");
        const receipt = await revealTx.wait();
        console.log("Transaction mined:", receipt.transactionHash);

        // Now call the revealVoucherView function to get the decrypted code
        console.log("Calling revealVoucherView...");
        let decryptedCode;
        try {
          decryptedCode = await contract.callStatic.revealVoucherView(voucher.id);
        } catch (error) {
          console.error("Error in revealVoucherView:", error);
          throw error;
        }

        console.log("Decrypted code received:", decryptedCode);

        // Convert the BigNumber to a hexadecimal string
        const hexString = decryptedCode.toHexString().slice(2); // Remove '0x' prefix
        console.log("Hex string:", hexString);

        // Convert hex string to bytes
        const bytes = Buffer.from(hexString, 'hex');
        console.log("Bytes:", bytes);

        // Try to interpret as a big-endian unsigned integer
        const bigInt = BigInt(`0x${hexString}`);
        console.log("As BigInt:", bigInt.toString());

        // Try to interpret as a little-endian unsigned integer
        const littleEndianHex = hexString.match(/.{1,2}/g)?.reverse().join('') || '';
        const littleEndianBigInt = BigInt(`0x${littleEndianHex}`);
        console.log("As little-endian BigInt:", littleEndianBigInt.toString());

        // Set the revealed code to the big-endian interpretation for now
        setRevealedCode(bigInt.toString());
        setIsRevealModalOpen(true);

      } catch (error) {
        console.error("Failed to reveal voucher:", error);
        alert(`Failed to reveal voucher: ${error.message}`);
      } finally {
        setIsRevealing(false);
      }
    } else {
      alert("Please connect your wallet and ensure you're on the correct network.");
    }
  };




  const revealVoucherCode = async (voucher: VoucherMetadata) => {
    if (typeof window.ethereum !== "undefined" && isConnected && isCorrectChain) {
      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const providerUrl = provider.connection.url;

        const response = await fetch('/api/reveal-voucher', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            voucherId: voucher.id,
            providerUrl,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to reveal voucher');
        }

        const data = await response.json();
        setRevealedCode(data.revealedCode);
      } catch (error) {
        console.error("Failed to reveal voucher:", error);
        alert("Failed to reveal voucher. See console for details.");
      }
    }
  };

  useEffect(() => {
    checkConnection();
    if (typeof window.ethereum !== "undefined") {
      window.ethereum.on("accountsChanged", checkConnection);
      window.ethereum.on("chainChanged", checkConnection);
    }
    return () => {
      if (typeof window.ethereum !== "undefined") {
        window.ethereum.removeListener("accountsChanged", checkConnection);
        window.ethereum.removeListener("chainChanged", checkConnection);
      }
    };
  }, []);

  const fetchVoucherMetadata = async () => {
    if (
      typeof window.ethereum !== "undefined" &&
      isConnected &&
      isCorrectChain
    ) {
      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        const signer = provider.getSigner();
        const address = await signer.getAddress();
        console.log("address", address);

        if (!address) {
          console.error("No address found");
          return;
        }

        const contract = new ethers.Contract(
          CONTRACT_ADDRESS,
          contractABI,
          signer
        );

        console.log("Calling getAllVouchersMetadata...");
        const metadata = await contract.getAllVouchersMetadata();
        console.log("Raw metadata:", metadata);

        const formattedMetadata = metadata.map((item: any) => {
          console.log("Processing item:", item);
          return {
            id: ethers.BigNumber.isBigNumber(item.voucherId)
              ? item.voucherId.toNumber()
              : Number(item.voucherId),
            price: ethers.BigNumber.isBigNumber(item.price)
              ? item.price.toNumber()
              : Number(item.price),
            expirationDate: ethers.BigNumber.isBigNumber(item.expiryDate)
              ? item.expiryDate.toNumber()
              : Number(item.expiryDate),
            imageUrl: item.imageUrl,
            name: item.description,
          };
        });

        console.log("Formatted metadata:", formattedMetadata);
        setVoucherMetadata(formattedMetadata);
      } catch (error) {
        console.error("Failed to fetch voucher metadata:", error);
        if (error instanceof Error) {
          console.error("Error name:", error.name);
          console.error("Error message:", error.message);
          console.error("Error stack:", error.stack);
        }
      }
    }
  };

  const handleBuyVoucher = async (voucherId: number, priceInSmallestUnit: number) => {
    if (typeof window.ethereum !== "undefined" && isConnected && isCorrectChain) {
      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        
        // Convert price to BigNumber (it's already in the smallest USDT unit)
        const priceInUSDT = ethers.BigNumber.from(priceInSmallestUnit);
        
        // ERC20 approval
        const erc20Contract = new ethers.Contract(
          ERC20_ADDRESS, 
          [
            "function approve(address spender, uint256 amount) public returns (bool)",
            "function allowance(address owner, address spender) public view returns (uint256)"
          ], 
          signer
        );

        // Check current allowance
        const currentAllowance = await erc20Contract.allowance(await signer.getAddress(), CONTRACT_ADDRESS);
        
        if (currentAllowance.lt(priceInUSDT)) {
          console.log(`Approving ${priceInUSDT.toString()} USDT for contract ${CONTRACT_ADDRESS}`);
          const approveTx = await erc20Contract.approve(CONTRACT_ADDRESS, ethers.constants.MaxUint256);
          console.log("Approval transaction hash:", approveTx.hash);
          await approveTx.wait();
          console.log("Approval transaction confirmed");
        } else {
          console.log("Sufficient allowance already exists");
        }
        
        // Buy voucher
        const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);
        console.log(`Buying voucher with ID ${voucherId}`);
        const buyTx = await contract.buyVoucher(voucherId);
        console.log("Buy transaction hash:", buyTx.hash);
        await buyTx.wait();
        console.log("Buy transaction confirmed");

        const boughtVoucher = voucherMetadata.find(v => v.id === voucherId);
        if (boughtVoucher) {
          setPurchasedVouchers(prev => [...prev, boughtVoucher]);
          setVoucherMetadata(prev => prev.filter(v => v.id !== voucherId));
        }
        
        alert("Voucher purchased successfully!");
      } catch (error) {
        console.error("Error buying voucher:", error);
        alert("Failed to buy voucher. See console for details.");
      }
    } else {
      alert("Please connect your wallet first.");
    }
  };



  // Helper function to format price for display
  const formatPrice = (priceInSmallestUnit: number) => {
    const priceInUSDT = ethers.utils.formatUnits(priceInSmallestUnit, 6);
    return Math.round(parseFloat(priceInUSDT)).toString();
  };

  useEffect(() => {
    if (isConnected && isCorrectChain) {
      console.log("fetching voucher metadata");
      fetchVoucherMetadata();
    }
  }, [isConnected, isCorrectChain]);

  const checkConnection = async () => {
    if (typeof window.ethereum !== "undefined") {
      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const accounts = await provider.listAccounts();
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          setIsConnected(true);
          const network = await provider.getNetwork();
          setIsCorrectChain(network.chainId === parseInt(FHENIX_CHAIN_ID, 16));
        } else {
          setWalletAddress("");
          setIsConnected(false);
          setIsCorrectChain(false);
        }
      } catch (error) {
        console.error("Failed to check connection:", error);
        setWalletAddress("");
        setIsConnected(false);
        setIsCorrectChain(false);
      }
    }
  };

  const connectWallet = async () => {
    if (typeof window.ethereum !== "undefined") {
      try {
        await window.ethereum.request({ method: "eth_requestAccounts" });
        await checkConnection();
        if (!isCorrectChain) {
          await switchToFhenixNetwork();
        }
      } catch (error) {
        console.error("Failed to connect wallet:", error);
      }
    } else {
      alert("Please install MetaMask!");
    }
  };

  const switchToFhenixNetwork = async () => {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: FHENIX_CHAIN_ID }],
      });
      await checkConnection(); // Add this line to recheck the connection after switching
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
                rpcUrls: ["http://127.0.0.1:42069"],
                blockExplorerUrls: [""],
                // rpcUrls: ["https://api.helium.fhenix.zone"],
                // blockExplorerUrls: ["https://explorer.helium.fhenix.zone"],
              },
            ],
          });
          await checkConnection(); // Add this line to recheck the connection after adding the network
        } catch (addError) {
          console.error("Failed to add the Fhenix network:", addError);
        }
      } else {
        console.error("Failed to switch to the Fhenix network:", switchError);
      }
    }
  };

  const handleSellVoucherClick = async (voucher: VoucherMetadata) => {
    if (typeof window.ethereum !== "undefined" && isConnected && isCorrectChain) {
      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);
  
        // You might want to prompt the user for a new price here
        const newPrice = ethers.utils.parseUnits("10", 6); // Example: 10 USDT
  
        const tx = await contract.resellVoucher(voucher.id, newPrice);
        await tx.wait();
  
        alert("Voucher listed for resale successfully!");
        // You might want to update the UI or refetch vouchers here
      } catch (error) {
        console.error("Failed to resell voucher:", error);
        alert("Failed to resell voucher. See console for details.");
      }
    }
  };

  const disconnectWallet = () => {
    setWalletAddress("");
    setIsConnected(false);
    setIsCorrectChain(false);
    setIsDropdownOpen(false);
  };

  const getButtonText = () => {
    if (!isConnected) return "Connect Wallet";
    if (!isCorrectChain) return "Switch to Fhenix Network";
    return `Connected: ${walletAddress.slice(0, 6)}...${walletAddress.slice(
      -4
    )}`;
  };

  const handleButtonClick = async () => {
    if (!isConnected) {
      await connectWallet();
    } else if (!isCorrectChain) {
      await switchToFhenixNetwork();
    } else {
      setIsDropdownOpen(!isDropdownOpen);
    }
  };

  return (
    <div className="min-h-screen bg-white font-inter">
      <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white border-b">
        <div className="flex items-center space-x-4">
          <FigmaIcon className="w-8 h-8" />
          <Input type="search" placeholder="Search for collections, NFTs or users" className="w-64" />
        </div>
        <nav className="flex items-center space-x-4">
        <Link href="#" className="font-bold">Explore</Link>
          <Link href="#" className="font-bold">Sell</Link>
          <Button 
      className="bg-blue-600 text-white hover:bg-blue-700"
      onClick={() => purchasedVouchers.length > 0 && handleRevealVoucherClick(purchasedVouchers[0])}
      disabled={purchasedVouchers.length === 0}
    >
      Reveal First Voucher
    </Button>
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
                <div
                  className="py-1"
                  role="menu"
                  aria-orientation="vertical"
                  aria-labelledby="options-menu"
                >
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
        <h1 className="text-[#108849] text-4xl font-normal">
          Enjoy instant discount
        </h1>
        <h1 className="flex items-center text-black text-4xl font-normal mb-4">
          on 400+ brands with <GiftIcon className="inline-block w-6 h-6 mr-2" />
          Gift Cards
        </h1>
        <div className="flex items-center gap-4">
          <Button
            variant="solid"
            className="bg-black text-white px-6 py-3 rounded-full"
          >
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
          <h2 className="text-2xl font-bold mb-4">Available Vouchers</h2>
          {voucherMetadata.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 bg-gray-100 rounded-lg">
              <svg className="w-24 h-24 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="mt-4 text-lg font-semibold text-gray-600">No vouchers available</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
    
            {voucherMetadata.map((voucher) => (
              <Card key={voucher.id}>
                <img
                  src={voucher.imageUrl}
                  alt={voucher.name}
                  className="w-full h-48 rounded-t-lg mb-4"
                  width="200"
                  height="200"
                  style={{ aspectRatio: "200/200", objectFit: "cover" }}
                />
                <CardContent className="flex flex-col items-center">
                  <p className="text-sm font-bold mb-2">{voucher.name}</p>
                  <div className="flex items-center mb-2">
                    <span className="text-sm mr-2">Price:</span>
                    <span className="text-sm font-bold">
                      {formatPrice(voucher.price)} USDT
                    </span>
                  </div>
                  <div className="text-sm mb-4">
                    Expires: {new Date(voucher.expirationDate * 1000).toLocaleDateString()}
                  </div>
                  <Button 
                    className="bg-black text-white hover:bg-gray-800" 
                    onClick={() => handleBuyVoucher(voucher.id, voucher.price)}
                  >
                    Buy Now
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          )}
        </section>
        <section>
          <h2 className="text-2xl font-bold mb-4">Trending</h2>
          {voucherMetadata.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 bg-gray-100 rounded-lg">
              <svg className="w-24 h-24 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <p className="mt-4 text-lg font-semibold text-gray-600">No trending data available</p>
            </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Image</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Expiration Date</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {voucherMetadata.map((voucher) => (
                <TableRow key={voucher.id}>
                  <TableCell>{voucher.id}</TableCell>
                  <TableCell>
                    <img
                      src={voucher.imageUrl}
                      alt={voucher.name}
                      className="w-10 h-10 rounded-full object-cover"
                      width="40"
                      height="40"
                    />
                  </TableCell>
                  <TableCell>{formatPrice(voucher.price)} USDT</TableCell>
                  <TableCell>
                    {new Date(voucher.expirationDate * 1000).toLocaleDateString()}
                  </TableCell>
                  <TableCell>{voucher.name}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )}
        </section>
<section className="mt-8">
<div className="flex items-center gap-2 mb-4">
    <h2 className="text-2xl font-bold">My Purchased Vouchers</h2>
    <Button
      variant="ghost"
      size="sm"
      onClick={refreshData}
      title="Refresh Vouchers"
      className="p-1"
    >
      <RefreshCw className="h-4 w-4" />
    </Button>
  </div>
  {purchasedVouchers.length === 0 ? (
    <div className="flex flex-col items-center justify-center p-8 bg-gray-100 rounded-lg">
      <svg className="w-24 h-24 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h18v18H3z M16 8l-8 8-4-4-6 6" />
      </svg>
      <p className="mt-4 text-lg font-semibold text-gray-600">You haven't purchased any vouchers yet.</p>
    </div>
  ) : (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {purchasedVouchers.map((voucher) => (
        <Card key={voucher.id}>
          <img
            src={voucher.imageUrl}
            alt={voucher.name}
            className="w-full h-48 rounded-t-lg mb-4"
            width="200"
            height="200"
            style={{ aspectRatio: "200/200", objectFit: "cover" }}
          />
          <CardContent className="flex flex-col items-center">
            <p className="text-sm font-bold mb-2">{voucher.name}</p>
            <div className="flex items-center mb-2">
              <span className="text-sm mr-2">Price:</span>
              <span className="text-sm font-bold">
                {formatPrice(voucher.price)} USDT
              </span>
            </div>
            <div className="text-sm mb-4">
              Expires: {new Date(voucher.expirationDate * 1000).toLocaleDateString()}
            </div>
            <div className="flex space-x-2">
              <Button 
                className="bg-blue-600 text-white hover:bg-blue-700"
                onClick={() => handleRevealVoucherClick(voucher)}
              >
                Reveal Now
              </Button>
              <Button 
                className="bg-green-600 text-white hover:bg-green-700"
                onClick={() => handleSellVoucherClick(voucher)}
              >
                Sell Now
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )}
</section>
      </main>
      <footer className="bg-black text-white py-4 px-6 flex justify-between items-center">
        <p className="text-sm">&copy; 2024 FHE2P. All rights reserved.</p>
        <nav className="flex items-center space-x-4">
          <Link
            href="#"
            className="text-sm hover:text-gray-300"
            prefetch={false}
          >
            Terms of Service
          </Link>
          <Link
            href="#"
            className="text-sm hover:text-gray-300"
            prefetch={false}
          >
            Privacy Policy
          </Link>
        </nav>
      </footer>
      {isRevealModalOpen && revealedVoucher && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg max-w-md w-full">
          <h2 className="text-2xl font-bold mb-4">You are going reveal a voucher!!!</h2>
          <img
            src={revealedVoucher.imageUrl}
            alt={revealedVoucher.name}
            className="w-full h-48 object-cover mb-4 rounded"
          />
          <h3 className="text-lg font-bold">{revealedVoucher.name}</h3>
          <p>Price: {formatPrice(revealedVoucher.price)} USDT</p>
          <p>Expires: {new Date(revealedVoucher.expirationDate * 1000).toLocaleDateString()}</p>
          {revealedCode ? (
            <p>Revealed Code: {revealedCode}</p>
          ) : (
            <Button 
              className="mt-4 bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => revealVoucherCode(revealedVoucher)}
            >
              Reveal Code
            </Button>
          )}
          <Button 
            className="mt-4 bg-black text-white hover:bg-gray-800"
            onClick={() => setIsRevealModalOpen(false)}
          >
            Close
          </Button>
        </div>
      </div>
    )}
    </div>
  );
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
  );
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
  );
}
