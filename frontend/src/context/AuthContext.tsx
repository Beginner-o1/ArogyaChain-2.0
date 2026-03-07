import React, { createContext, useContext, useState } from "react";
import { ethers } from "ethers";
import ContractABI from "../abi/Contract.json";
import { CONTRACT_ADDRESS } from "../config";

export type Role =
  | "patient"
  | "doctor"
  | "pharmacy"
  | "scan"
  | "unregistered"
  | null;

interface AuthContextType {
  account: string | null;
  role: Role;
  loading: boolean;
  isAdmin: boolean;
  contract: ethers.Contract | null;
  provider: ethers.BrowserProvider | null;
  connectWallet: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [account,  setAccount]  = useState<string | null>(null);
  const [role,     setRole]     = useState<Role>(null);
  const [loading,  setLoading]  = useState<boolean>(false);
  const [isAdmin,  setIsAdmin]  = useState<boolean>(false);
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);

  const detectRole = async (
    addr: string,
    contract: ethers.Contract
  ): Promise<Role> => {
    try {
      const [isPatient, isDoctor, isPharmacy, isScanCenter] =
        await Promise.all([
          contract.isPatient(addr),
          contract.isDoctor(addr),
          contract.isPharmacy(addr),
          contract.isScanCenter(addr),
        ]);

      if (isPatient)    return "patient";
      if (isDoctor)     return "doctor";
      if (isPharmacy)   return "pharmacy";
      if (isScanCenter) return "scan";

      return "unregistered";
    } catch (error) {
      console.error("Role detection failed:", error);
      return null;
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("MetaMask not installed");
      return;
    }

    try {
      setLoading(true);

      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const signer = await browserProvider.getSigner();
      const address = await signer.getAddress();

      setAccount(address);
      setProvider(browserProvider);

      const contractInstance = new ethers.Contract(
        CONTRACT_ADDRESS,
        ContractABI.abi,
        signer
      );
      setContract(contractInstance);

      const [detectedRole, adminAddress] = await Promise.all([
        detectRole(address, contractInstance),
        contractInstance.admin(),
      ]);

      setRole(detectedRole);
      setIsAdmin(address.toLowerCase() === adminAddress.toLowerCase());
    } catch (error) {
      console.error("Wallet connection failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (window.ethereum) {
        await window.ethereum.request({
          method: "wallet_revokePermissions",
          params: [{ eth_accounts: {} }],
        });
      }
    } catch (error) {
      console.error("Error revoking MetaMask permissions:", error);
    } finally {
      setAccount(null);
      setRole(null);
      setIsAdmin(false);
      setContract(null);
      setProvider(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{ account, role, loading, isAdmin, contract, provider, connectWallet, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};