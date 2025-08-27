import React, { useState, useEffect } from 'react';
import { Web3 } from 'web3';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Container, Alert, Spinner } from 'react-bootstrap';

// Import child components for different user dashboards
import WalletConnection from './components/WalletConnection';
import PatientDashboard from './components/PatientDashboard';
import DoctorDashboard from './components/DoctorDashboard';
import AdminDashboard from './components/AdminDashboard';

// ----------------- Smart Contract Configuration -----------------

// Replace this with the address of your deployed contract on Polygon Amoy
const CONTRACT_ADDRESS = '0xffa56458e608F1d5E755E87d73141eb752035097';

// ABI (Application Binary Interface) – 
// This describes the contract’s functions and events so Web3 can interact with it.
// Replace this with the abi of your deployed contract on Polygon Amoy

const CONTRACT_ABI = [
	{
		"inputs": [],
		"stateMutability": "nonpayable",
		"type": "constructor"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "doctor",
				"type": "address"
			}
		],
		"name": "DoctorAuthorized",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "doctor",
				"type": "address"
			}
		],
		"name": "DoctorRevoked",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "recordId",
				"type": "uint256"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "patient",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "doctor",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "string",
				"name": "ipfsHash",
				"type": "string"
			}
		],
		"name": "RecordCreated",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "recordId",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "string",
				"name": "newIpfsHash",
				"type": "string"
			}
		],
		"name": "RecordUpdated",
		"type": "event"
	},
	{
		"inputs": [],
		"name": "admin",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_doctor",
				"type": "address"
			}
		],
		"name": "authorizeDoctor",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "authorizedDoctors",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_patient",
				"type": "address"
			},
			{
				"internalType": "string",
				"name": "_ipfsHash",
				"type": "string"
			}
		],
		"name": "createRecord",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_recordId",
				"type": "uint256"
			}
		],
		"name": "deactivateRecord",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "doctorRecords",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "getAuthorizedDoctors",
		"outputs": [
			{
				"internalType": "address[]",
				"name": "",
				"type": "address[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_doctor",
				"type": "address"
			}
		],
		"name": "getDoctorRecords",
		"outputs": [
			{
				"internalType": "uint256[]",
				"name": "",
				"type": "uint256[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_patient",
				"type": "address"
			}
		],
		"name": "getPatientRecords",
		"outputs": [
			{
				"internalType": "uint256[]",
				"name": "",
				"type": "uint256[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_recordId",
				"type": "uint256"
			}
		],
		"name": "getRecord",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "id",
				"type": "uint256"
			},
			{
				"internalType": "address",
				"name": "patient",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "doctor",
				"type": "address"
			},
			{
				"internalType": "string",
				"name": "ipfsHash",
				"type": "string"
			},
			{
				"internalType": "uint256",
				"name": "timestamp",
				"type": "uint256"
			},
			{
				"internalType": "bool",
				"name": "isActive",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_doctor",
				"type": "address"
			}
		],
		"name": "isAuthorizedDoctor",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "patientRecords",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "recordCount",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_recordId",
				"type": "uint256"
			}
		],
		"name": "recordExistsCheck",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "records",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "id",
				"type": "uint256"
			},
			{
				"internalType": "address",
				"name": "patient",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "doctor",
				"type": "address"
			},
			{
				"internalType": "string",
				"name": "ipfsHash",
				"type": "string"
			},
			{
				"internalType": "uint256",
				"name": "timestamp",
				"type": "uint256"
			},
			{
				"internalType": "bool",
				"name": "isActive",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_doctor",
				"type": "address"
			}
		],
		"name": "revokeDoctor",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_recordId",
				"type": "uint256"
			},
			{
				"internalType": "string",
				"name": "_newIpfsHash",
				"type": "string"
			}
		],
		"name": "updateRecord",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	}
]

// Polygon Amoy Testnet settings for MetaMask
const POLYGON_AMOY_CONFIG = {
  chainId: '0x13882', // Hexadecimal for 80002
  chainName: 'Polygon Amoy Testnet',
  nativeCurrency: {
    name: 'POL',
    symbol: 'POL',
    decimals: 18,
  },
  rpcUrls: ['https://polygon-amoy.g.alchemy.com/v2/Qdl451OveKTEN9MfquBiz'], // Replace with your own RPC
  blockExplorerUrls: ['https://amoy.polygonscan.com/'],
};

// ----------------- Main App Component -----------------
function App() {
  // React state variables
  const [web3, setWeb3] = useState(null);       // Web3 instance for blockchain connection
  const [account, setAccount] = useState('');   // User’s connected wallet address
  const [contract, setContract] = useState(null); // Smart contract instance
  const [userRole, setUserRole] = useState(''); // Role: Admin, Doctor, or Patient
  const [loading, setLoading] = useState(false); // Loading indicator
  const [error, setError] = useState('');       // Error messages

  // When web3, account, and contract are ready → determine user role
  useEffect(() => {
    if (web3 && account && contract) {
      checkUserRole();
    }
  }, [web3, account, contract]);

  // ----------------- Connect Wallet -----------------
  const connectWallet = async () => {
    try {
      setLoading(true);
      setError('');

      // Ensure MetaMask is installed
      if (typeof window.ethereum === 'undefined') {
        throw new Error('MetaMask is not installed');
      }

      // Request wallet connection
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts.length === 0) {
        throw new Error('No accounts found in MetaMask');
      }

      // Initialize Web3 with MetaMask provider
      const web3Instance = new Web3(window.ethereum);
      setWeb3(web3Instance);
      setAccount(accounts[0]); // Use first connected account

      // Ensure user is connected to Polygon Amoy testnet
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: POLYGON_AMOY_CONFIG.chainId }],
        });
      } catch (switchError) {
        // If Amoy network not found → add it
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [POLYGON_AMOY_CONFIG],
          });
        }
      }

      // Create a contract instance to interact with deployed smart contract
      const contractInstance = new web3Instance.eth.Contract(
        CONTRACT_ABI,
        CONTRACT_ADDRESS
      );
      setContract(contractInstance);

    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // ----------------- Check User Role -----------------
  const checkUserRole = async () => {
    try {
      // Admin: check if account matches contract admin address
      const adminAddress = await contract.methods.admin().call();
      if (adminAddress.toLowerCase() === account.toLowerCase()) {
        setUserRole('Admin');
        return;
      }

      // Doctor: check if account is in authorized doctors list
      const isDoctor = await contract.methods.isAuthorizedDoctor(account).call();
      if (isDoctor) {
        setUserRole('Doctor');
        return;
      }

      // Otherwise → assume patient role
      setUserRole('Patient');
    } catch (error) {
      console.error('Error checking user role:', error);
      setUserRole('Patient');
    }
  };

  // ----------------- Disconnect Wallet -----------------
  const disconnect = () => {
    setWeb3(null);
    setAccount('');
    setContract(null);
    setUserRole('');
  };

  // ----------------- MetaMask Event Listeners -----------------
  useEffect(() => {
    if (window.ethereum) {
      // If user switches account → update state
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          disconnect();
        } else {
          setAccount(accounts[0]);
        }
      });

      // If user switches network → reload the app
      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners();
      }
    };
  }, []);

  // ----------------- Render Role-Based Dashboards -----------------
  const renderDashboard = () => {
    const props = { web3, account, contract };

    switch (userRole) {
      case 'Admin':
        return <AdminDashboard {...props} />;
      case 'Doctor':
        return <DoctorDashboard {...props} />;
      case 'Patient':
        return <PatientDashboard {...props} />;
      default:
        return (
          <Alert variant="info">
            <Spinner animation="border" size="sm" className="me-2" />
            Determining user role...
          </Alert>
        );
    }
  };

  return (
    <Container className="py-4">
      <h1 className="text-center mb-4">
        🏥 Patient Records DApp
      </h1>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {!account ? (
        <WalletConnection onConnect={connectWallet} loading={loading} />
      ) : (
        <div>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <strong>Connected Account:</strong>{' '}
              <code>{account}</code>
              <br />
              <strong>Role:</strong>{' '}
              <span className="badge bg-primary">{userRole || 'Loading...'}</span>
            </div>
            <button className="btn btn-outline-secondary" onClick={disconnect}>
              Disconnect
            </button>
          </div>

          {userRole && renderDashboard()}
        </div>
      )}
    </Container>
  );
}

export default App;