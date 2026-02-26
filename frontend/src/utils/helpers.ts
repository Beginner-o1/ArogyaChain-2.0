import { ethers } from "ethers";

export const formatAddress = (address: string): string => {
  if (!address) return "";
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

export const formatDate = (timestamp: number): string => {
  return new Date(timestamp * 1000).toLocaleString();
};

export const handleError = (error: any): string => {
  if (error.reason) return error.reason;
  if (error.message) return error.message;
  return "An unknown error occurred";
};

export const convertToBytes32 = (hash: string): string => {
  // Remove '0x' if present and ensure it's 64 characters
  const cleanHash = hash.replace(/^0x/, "");
  if (cleanHash.length !== 64) {
    throw new Error("Hash must be 32 bytes (64 hex characters)");
  }
  return `0x${cleanHash}`;
};

export const isValidAddress = (address: string): boolean => {
  try {
    return ethers.isAddress(address);
  } catch {
    return false;
  }
};
