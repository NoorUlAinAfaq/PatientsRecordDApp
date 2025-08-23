import React, { useState, useEffect } from 'react';
import { Web3 } from 'web3';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Container, Alert, Spinner } from 'react-bootstrap';
import WalletConnection from './components/WalletConnection';
import PatientDashboard from './components/PatientDashboard';
import DoctorDashboard from './components/DoctorDashboard';
import AdminDashboard from './components/AdminDashboard';

// Replace with your deployed contract address
const CONTRACT_ADDRESS = '0x1Db1c29Fec46eD8F4cfa4Cc5A221601cE8Af4Ba3';

// Your contract ABI (copy from Remix after compilation)
const CONTRACT_ABI = 
[
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
	}

]

// Polygon Amoy Testnet Configuration
const POLYGON_AMOY_CONFIG = {
  chainId: '0x13882', // 80002 in hex
  chainName: 'Polygon Amoy Testnet',
  nativeCurrency: {
    name: 'MATIC',
    symbol: 'MATIC',
    decimals: 18,
  },
  rpcUrls: ['https://rpc-amoy.polygon.technology/'],
  blockExplorerUrls: ['https://amoy.polygonscan.com/'],
};

function App() {
  const [web3, setWeb3] = useState(null);
  const [account, setAccount] = useState('');
  const [contract, setContract] = useState(null);
  const [userRole, setUserRole] = useState(''); // 'admin', 'doctor', 'patient'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Initialize Web3 and check connection
  useEffect(() => {
    if (web3 && account && contract) {
      checkUserRole();
    }
  }, [web3, account, contract]);

  const connectWallet = async () => {
    try {
      setLoading(true);
      setError('');

      // Check if MetaMask is installed
      if (typeof window.ethereum === 'undefined') {
        throw new Error('MetaMask is not installed');
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      // Initialize Web3
      const web3Instance = new Web3(window.ethereum);
      setWeb3(web3Instance);
      setAccount(accounts[0]);

      // Check and switch to Polygon Amoy network
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: POLYGON_AMOY_CONFIG.chainId }],
        });
      } catch (switchError) {
        // If network doesn't exist, add it
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [POLYGON_AMOY_CONFIG],
          });
        }
      }

      // Initialize contract
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

  const checkUserRole = async () => {
    try {
      // Check if user is admin
      const adminAddress = await contract.methods.admin().call();
      if (adminAddress.toLowerCase() === account.toLowerCase()) {
        setUserRole('Admin');
        return;
      }

      // Check if user is authorized doctor
      const isDoctor = await contract.methods.isAuthorizedDoctor(account).call();
      if (isDoctor) {
        setUserRole('Doctor');
        return;
      }

      // Default to patient
      setUserRole('Patient');
    } catch (error) {
      console.error('Error checking user role:', error);
      setUserRole('Patient');
    }
  };

  const disconnect = () => {
    setWeb3(null);
    setAccount('');
    setContract(null);
    setUserRole('');
  };

  // Listen for account changes
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          disconnect();
        } else {
          setAccount(accounts[0]);
        }
      });

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