import 'react-native-get-random-values';
import '@ethersproject/shims';
import { ethers } from 'ethers';

// Shardeum Sphinx Dapp Testnet Details
const RPC_URL = process.env.EXPO_PUBLIC_SHARDEUM_RPC_URL || 'https://dapps.shardeum.org';
const CHAIN_ID = 8081;
const CONTRACT_ADDRESS = process.env.EXPO_PUBLIC_SHARDEUM_CONTRACT_ADDRESS || '';

// Minimal ABI for the logEvidence function
const EVIDENCE_LOG_ABI = [
  "function logEvidence(string memory _incidentId, string memory _mediaHash) public returns (bytes32)",
  "function totalLogs() public view returns (uint256)",
  "event EvidenceLogged(bytes32 indexed recordHash, string incidentId, uint256 timestamp)"
];

/**
 * @dev Computes a SHA-256 hash of a string (e.g., a media URL or file path).
 */
export const computeMediaHash = (data: string): string => {
  return ethers.utils.id(data); 
};

/**
 * @dev Logs an incident evidence hash to the Shardeum blockchain.
 * @param incidentId The unique ID of the emergency alert.
 * @param mediaUrl The URL or identifier of the media (photo/audio).
 * @param privateKey The private key of the wallet used to sign the transaction.
 */
export const logToShardeum = async (
  incidentId: string,
  mediaUrl: string,
  privateKey: string
): Promise<{ txHash: string; recordHash: string } | null> => {
  try {
    if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS === '') {
      console.warn('[Shardeum] Contract address not configured');
      return null;
    }

    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, EVIDENCE_LOG_ABI, wallet);

    const mediaHash = computeMediaHash(mediaUrl);
    
    console.log(`[Shardeum] Logging evidence for Incident: ${incidentId}...`);
    
    const tx = await contract.logEvidence(incidentId, mediaHash);
    const receipt = await tx.wait();

    console.log(`[Shardeum] Transaction confirmed: ${receipt.hash}`);

    // Parse logs to find the recordHash from the EvidenceLogged event
    // The first event should be our EvidenceLogged event
    const recordHash = receipt.logs[0].topics[1]; // bytes32 recordHash is the first indexed param

    return {
      txHash: receipt.hash,
      recordHash: recordHash
    };
  } catch (error) {
    console.error('[Shardeum] Error logging to blockchain:', error);
    return null;
  }
};

/**
 * @dev Returns the Shardeum Explorer link for a transaction or record.
 */
export const getExplorerLink = (type: 'tx' | 'address' | 'block', value: string): string => {
  const baseUrl = 'https://explorer-dapps.shardeum.org';
  return `${baseUrl}/${type}/${value}`;
};
