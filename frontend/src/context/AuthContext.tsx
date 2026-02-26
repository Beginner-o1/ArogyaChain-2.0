import React, { createContext, useContext, useState } from "react";
import { ethers } from "ethers";
import ContractABI from "../abi/Contract.json";
import { CONTRACT_ADDRESS } from "../config";

export type Role =
  | "patient"
  | "doctor"
  | "inactive-doctor"
  | "pharmacy"
  | "inactive-pharmacy"
  | "scan"
  | "inactive-scan"
  | "unregistered"
  | null;

interface AuthContextType {
  account: string | null;
  role: Role;
  loading: boolean;
  contract: ethers.Contract | null;
  provider: ethers.BrowserProvider | null;
  connectWallet: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [account, setAccount] = useState<string | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);

  const detectRole = async (
    addr: string,
    contract: ethers.Contract
  ): Promise<Role> => {
    try {
      // Check base roles in parallel (faster UX)
      const [isPatient, isDoctor, isPharmacy, isScanCenter] =
        await Promise.all([
          contract.isPatient(addr),
          contract.isDoctor(addr),
          contract.isPharmacy(addr),
          contract.isScanCenter(addr),
        ]);

      if (isPatient) return "patient";

      if (isDoctor) {
        const active = await contract.isDoctorActive(addr);
        return active ? "doctor" : "inactive-doctor";
      }

      if (isPharmacy) {
        const active = await contract.isPharmacyActive(addr);
        return active ? "pharmacy" : "inactive-pharmacy";
      }

      if (isScanCenter) {
        const active = await contract.isScanCenterActive(addr);
        return active ? "scan" : "inactive-scan";
      }

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

      const detectedRole = await detectRole(address, contractInstance);
      setRole(detectedRole);
    } catch (error) {
      console.error("Wallet connection failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setAccount(null);
    setRole(null);
    setContract(null);
    setProvider(null);
  };

  return (
    <AuthContext.Provider
      value={{ account, role, loading, contract, provider, connectWallet, logout }}
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