import React, { useState, useEffect } from 'react';
import { Card, Button, Form, Alert, Table, Modal, Badge, Spinner, Tab, Tabs, ListGroup } from 'react-bootstrap';
import { uploadToIPFS, getFromIPFS } from '../services/ipfsService';

const DoctorDashboard = ({ web3, account, contract }) => {
  const [patientAddress, setPatientAddress] = useState('');
  const [medicalData, setMedicalData] = useState({
    patientName: '',
    diagnosis: '',
    treatment: '',
    notes: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [doctorRecords, setDoctorRecords] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [ipfsData, setIpfsData] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authorizedDoctors, setAuthorizedDoctors] = useState([]);
  const [checkingAuthorization, setCheckingAuthorization] = useState(true);

  useEffect(() => {
    checkAuthorization();
    loadDoctorRecords();
  }, [account]);

  const checkAuthorization = async () => {
    try {
      setCheckingAuthorization(true);
      const authorized = await contract.methods.authorizedDoctors(account).call();
      setIsAuthorized(authorized);
      
      if (authorized) {
        // Load all authorized doctors (this would need admin functionality)
        // For now, just show current doctor's status
        setAuthorizedDoctors([{ address: account, authorized: true }]);
      }
    } catch (error) {
      console.error('Error checking authorization:', error);
      setIsAuthorized(false);
    } finally {
      setCheckingAuthorization(false);
    }
  };

  // Replace the loadDoctorRecords function in DoctorDashboard.js with this:

const loadDoctorRecords = async () => {
  try {
    setLoading(true);
    console.log('Loading doctor records for account:', account);
    
    // First check if this account is an authorized doctor
    const isAuthorized = await contract.methods.isAuthorizedDoctor(account).call();
    console.log('Is authorized doctor:', isAuthorized);
    
    if (!isAuthorized) {
      setMessage({ 
        type: 'warning', 
        text: 'You are not authorized as a doctor. Please contact the admin to get authorized.' 
      });
      setDoctorRecords([]);
      setLoading(false);
      return;
    }

    // Try to get doctor records
    try {
      console.log('Calling getDoctorRecords...');
      const recordIds = await contract.methods.getDoctorRecords(account).call({ from: account });
      console.log('Record IDs returned:', recordIds);
      
      if (!recordIds || recordIds.length === 0) {
        console.log('No record IDs found');
        setDoctorRecords([]);
        setLoading(false);
        return;
      }

      // Load individual records
      const records = [];
      console.log('Loading individual records...');
      
      for (let i = 0; i < recordIds.length; i++) {
        const id = recordIds[i];
        console.log(`Loading record ${id}...`);
        
        try {
          const record = await contract.methods.getRecord(id).call({ from: account });
          console.log(`Record ${id} loaded:`, record);
          records.push(record);
        } catch (recordError) {
          console.error(`Error loading record ${id}:`, recordError);
          // Continue with other records even if one fails
        }
      }
      
      console.log('All records loaded:', records);
      setDoctorRecords(records);
      
      if (records.length === 0) {
        setMessage({ 
          type: 'info', 
          text: `Found ${recordIds.length} record ID(s) but couldn't load the record details. Check console for errors.` 
        });
      }
      
    } catch (getDoctorRecordsError) {
      console.error('Error calling getDoctorRecords:', getDoctorRecordsError);
      
      // // Fallback: Try to get records from recent transactions
      // await loadRecordsFromEvents();
    }
    
  } catch (error) {
    console.error('Error in loadDoctorRecords:', error);
    setMessage({ 
      type: 'danger', 
      text: `Error loading records: ${error.message}` 
    });
  } finally {
    setLoading(false);
  }
};

// // Add this fallback function to load records from localStorage or events
// const loadRecordsFromEvents = async () => {
//   try {
//     console.log('Trying fallback method to load records...');
    
//     // Check localStorage for created records (as backup)
//     const savedRecords = localStorage.getItem(`doctorRecords_${account}`);
//     if (savedRecords) {
//       const recordIds = JSON.parse(savedRecords);
//       console.log('Found saved record IDs:', recordIds);
      
//       const records = [];
//       for (let id of recordIds) {
//         try {
//           const record = await contract.methods.getRecord(id).call({ from: account });
//           records.push(record);
//         } catch (error) {
//           console.log(`Could not load saved record ${id}`);
//         }
//       }
      
//       if (records.length > 0) {
//         setDoctorRecords(records);
//         setMessage({ 
//           type: 'success', 
//           text: `Loaded ${records.length} record(s) from backup storage.` 
//         });
//         return;
//       }
//     }
    
//     setMessage({ 
//       type: 'info', 
//       text: 'No records found. Create your first patient record using the form above.' 
//     });
    
//   } catch (error) {
//     console.error('Fallback loading failed:', error);
//   }
// };
  const createPatientRecord = async (e) => {
  e.preventDefault();

  if (!isAuthorized) {
    setMessage({ type: 'danger', text: 'You are not authorized to create records. Contact admin.' });
    return;
  }

  if (!web3.utils.isAddress(patientAddress)) {
    setMessage({ type: 'danger', text: 'Please enter a valid patient Ethereum address' });
    return;
  }

  try {
    setLoading(true);
    setMessage({ type: '', text: '' });

    // Prepare record JSON
    const recordData = {
      ...medicalData,
      doctor: account,
      patient: patientAddress,
      timestamp: Date.now()
    };

    // ✅ Upload to Pinata
    setMessage({ type: 'info', text: 'Uploading medical data to IPFS (via Pinata)...' });
    const ipfsHash = await uploadToIPFS(recordData);

    // Save CID on blockchain
    setMessage({ type: 'info', text: 'Creating record on blockchain...' });
    const gasEstimate = await contract.methods.createRecord(patientAddress, ipfsHash).estimateGas({ from: account });

    const result = await contract.methods.createRecord(patientAddress, ipfsHash).send({
      from: account,
      gas: Math.floor(Number(gasEstimate) * 1.2)
    });

    setMessage({ 
      type: 'success', 
      text: `✅ Patient record created successfully! Record ID: ${result.events.RecordCreated.returnValues.recordId}` 
    });
// Add this code in your createPatientRecord function after the successful transaction

// Get the record ID from transaction result
let recordId;
if (result.events && result.events.RecordCreated) {
  recordId = result.events.RecordCreated.returnValues.recordId;
} else {
  // Fallback: get current record count
  const recordCountBigInt = await contract.methods.recordCount().call();
  recordId = recordCountBigInt.toString(); // Convert BigInt to string
}

console.log('Created record ID:', recordId);

// Save record ID to localStorage as backup (ensure it's a string)
const existingRecords = JSON.parse(localStorage.getItem(`doctorRecords_${account}`) || '[]');
const recordIdString = recordId.toString();
if (!existingRecords.includes(recordIdString)) {
  existingRecords.push(recordIdString);
  localStorage.setItem(`doctorRecords_${account}`, JSON.stringify(existingRecords));
}

setMessage({ 
  type: 'success', 
  text: `Patient record created successfully! Record ID: ${recordId}` 
});

// Reset form
setPatientAddress('');
setMedicalData({
  patientName: '',
  diagnosis: '',
  treatment: '',
  notes: '',
  date: new Date().toISOString().split('T')[0]
});

// Reload records
setTimeout(() => loadDoctorRecords(), 2000); // Small delay to ensure blockchain state is updated
    // Reset form
    setPatientAddress('');
    setMedicalData({
      patientName: '',
      diagnosis: '',
      treatment: '',
      notes: '',
      date: new Date().toISOString().split('T')[0]
    });

    // Refresh records
    await loadDoctorRecords();

  } catch (error) {
    console.error('Error creating record:', error);
    setMessage({ type: 'danger', text: `Error: ${error.message || 'Failed to create patient record'}` });
  } finally {
    setLoading(false);
  }
};


  const viewRecord = async (record) => {
  try {
    setLoading(true);
    setSelectedRecord(record);

    // ✅ Fetch JSON from Pinata Gateway
    const ipfsData = await getFromIPFS(record.ipfsHash);
    setIpfsData(JSON.stringify(ipfsData, null, 2));

    setShowModal(true);
  } catch (error) {
    setMessage({ type: 'danger', text: 'Error loading record data from IPFS' });
  } finally {
    setLoading(false);
  }
};


  // const formatAddress = (address) => {
  //   return `${address.substring(0, 6)}...${address.substring(38)}`;
  // };

  // Add or replace your formatTimestamp function in DoctorDashboard.js

const formatTimestamp = (timestamp) => {
  try {
    // Handle both BigInt and string/number timestamps
    const timestampNumber = typeof timestamp === 'bigint' 
      ? Number(timestamp) 
      : Number(timestamp.toString());
    
    // Convert from seconds to milliseconds if needed
    const timestampMs = timestampNumber > 1e12 ? timestampNumber : timestampNumber * 1000;
    
    return new Date(timestampMs).toLocaleString();
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return 'Invalid date';
  }
};

const formatAddress = (address) => {
  if (!address) return '';
  return `${address.substring(0, 6)}...${address.substring(38)}`;
};

  if (checkingAuthorization) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" role="status" className="me-2" />
        <span>Checking authorization status...</span>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div>
        <h2 className="mb-4">👩‍⚕️ Doctor Dashboard</h2>
        
        <Alert variant="warning" className="mb-4">
          <h5>⚠️ Not Authorized</h5>
          <p>Your account <code>{formatAddress(account)}</code> is not authorized to access the doctor dashboard.</p>
          <p>Please contact the system administrator to get authorized as a doctor.</p>
        </Alert>

        <Card>
          <Card.Header>
            <h5>ℹ️ Authorization Information</h5>
          </Card.Header>
          <Card.Body>
            <p><strong>Your Address:</strong> <code>{account}</code></p>
            <p><strong>Status:</strong> <Badge bg="danger">Not Authorized</Badge></p>
            <p><strong>Network:</strong> Polygon Amoy Testnet</p>
            
            <Alert variant="info">
              <strong>💡 To get authorized:</strong>
              <ul className="mb-0">
                <li>Contact the system administrator</li>
                <li>Provide your Ethereum address: <code>{account}</code></li>
                <li>Wait for the admin to authorize your account</li>
                <li>Refresh this page after authorization</li>
              </ul>
            </Alert>
          </Card.Body>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-4">👩‍⚕️ Doctor Dashboard</h2>
      
      {message.text && (
        <Alert 
          variant={message.type} 
          dismissible 
          onClose={() => setMessage({ type: '', text: '' })}
        >
          {message.text}
        </Alert>
      )}

      <Tabs defaultActiveKey="create" id="doctor-tabs" className="mb-4">
        {/* Create Record Tab */}
        <Tab eventKey="create" title="📝 Create Record">
          <Card>
            <Card.Header>
              <h5>Create New Patient Record</h5>
              <Badge bg="success">Authorized Doctor</Badge>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={createPatientRecord}>
                <div className="row">
                  <div className="col-md-6">
                    <Form.Group className="mb-3">
                      <Form.Label>Patient Ethereum Address *</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="0x..."
                        value={patientAddress}
                        onChange={(e) => setPatientAddress(e.target.value)}
                        required
                      />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Patient Name *</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Enter patient name"
                        value={medicalData.patientName}
                        onChange={(e) => setMedicalData({...medicalData, patientName: e.target.value})}
                        required
                      />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Date *</Form.Label>
                      <Form.Control
                        type="date"
                        value={medicalData.date}
                        onChange={(e) => setMedicalData({...medicalData, date: e.target.value})}
                        required
                      />
                    </Form.Group>
                  </div>

                  <div className="col-md-6">
                    <Form.Group className="mb-3">
                      <Form.Label>Diagnosis *</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        placeholder="Enter diagnosis"
                        value={medicalData.diagnosis}
                        onChange={(e) => setMedicalData({...medicalData, diagnosis: e.target.value})}
                        required
                      />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Treatment *</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        placeholder="Enter treatment plan"
                        value={medicalData.treatment}
                        onChange={(e) => setMedicalData({...medicalData, treatment: e.target.value})}
                        required
                      />
                    </Form.Group>
                  </div>
                </div>

                <Form.Group className="mb-3">
                  <Form.Label>Additional Notes</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    placeholder="Enter additional notes (optional)"
                    value={medicalData.notes}
                    onChange={(e) => setMedicalData({...medicalData, notes: e.target.value})}
                  />
                </Form.Group>

                <div className="d-grid">
                  <Button 
                    variant="primary" 
                    type="submit" 
                    disabled={loading}
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Creating Record...
                      </>
                    ) : (
                      '📋 Create Patient Record'
                    )}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Tab>

        {/* View Records Tab */}
        <Tab eventKey="records" title={`📁 My Records (${doctorRecords.length})`}>
          <Card>
            <Card.Header>
              <h5>My Patient Records</h5>
              <Button 
                variant="outline-primary" 
                size="sm"
                onClick={loadDoctorRecords}
                className="me-2"
              >
                🔄 Refresh
              </Button>
            </Card.Header>
            <Card.Body>
              {doctorRecords.length === 0 ? (
                <Alert variant="info">
                  You haven't created any patient records yet. Use the "Create Record" tab to add your first record.
                </Alert>
              ) : (
                <Table responsive striped>
                  <thead>
                    <tr>
                      <th>Record ID</th>
                      <th>Patient Address</th>
                      <th>IPFS Hash</th>
                      <th>Created</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doctorRecords.map((record, index) => (
                      <tr key={index}>
                        <td><code>{record.id}</code></td>
                        <td><code>{formatAddress(record.patient)}</code></td>
                        <td><code>{formatAddress(record.ipfsHash)}</code></td>
                        <td>{formatTimestamp(record.timestamp)}</td>
                        <td>
                          <Badge bg={record.isActive ? 'success' : 'danger'}>
                            {record.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td>
                          <Button 
                            variant="outline-primary" 
                            size="sm"
                            onClick={() => viewRecord(record)}
                          >
                            👁️ View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Tab>

        {/* Authorization Tab */}
        <Tab eventKey="authorization" title="🔐 Authorization">
          <Card>
            <Card.Header>
              <h5>Doctor Authorization Status</h5>
            </Card.Header>
            <Card.Body>
              <ListGroup variant="flush">
                <ListGroup.Item className="d-flex justify-content-between align-items-center">
                  <div>
                    <strong>Your Address:</strong><br />
                    <code>{account}</code>
                  </div>
                  <Badge bg="success">Authorized</Badge>
                </ListGroup.Item>
                
                <ListGroup.Item>
                  <strong>Authorization Status:</strong> Active
                </ListGroup.Item>
                
                <ListGroup.Item>
                  <strong>Records Created:</strong> {doctorRecords.length}
                </ListGroup.Item>
              </ListGroup>

              <Alert variant="info" className="mt-3">
                <strong>ℹ️ Authorization Information:</strong>
                <ul className="mb-0">
                  <li>Only authorized doctors can create patient records</li>
                  <li>Authorization is managed by the system administrator</li>
                  <li>If your authorization is revoked, you won't be able to create new records</li>
                  <li>Existing records remain accessible to authorized parties</li>
                </ul>
              </Alert>
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>

      {/* Record Details Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>📋 Patient Record Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedRecord && (
            <div>
              <div className="row mb-3">
                <div className="col-md-6">
                  <strong>Record ID:</strong> {selectedRecord.id}
                </div>
                <div className="col-md-6">
                  <strong>Status:</strong>{' '}
                  <Badge bg={selectedRecord.isActive ? 'success' : 'danger'}>
                    {selectedRecord.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
              
              <div className="row mb-3">
                <div className="col-md-6">
                  <strong>Patient:</strong><br />
                  <code>{selectedRecord.patient}</code>
                </div>
                <div className="col-md-6">
                  <strong>Created:</strong><br />
                  {formatTimestamp(selectedRecord.timestamp)}
                </div>
              </div>

              <div className="mb-3">
                <strong>IPFS Hash:</strong><br />
                <code>{selectedRecord.ipfsHash}</code>
              </div>

              <div className="mb-3">
                <strong>Medical Data (from IPFS):</strong>
                <pre className="bg-light p-3 rounded mt-2">
                  {ipfsData}
                </pre>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Doctor Info */}
      <div className="row mt-4">
        <div className="col-12">
          <Card>
            <Card.Header>
              <h5>ℹ️ Doctor Information</h5>
            </Card.Header>
            <Card.Body>
              <p><strong>Your Address:</strong> <code>{account}</code></p>
              <p><strong>Status:</strong> <Badge bg="success">Authorized Doctor</Badge></p>
              <p><strong>Total Records Created:</strong> {doctorRecords.length}</p>
              <p><strong>Network:</strong> Polygon Amoy Testnet</p>
              
              <Alert variant="info">
                <strong>💡 Tips:</strong>
                <ul className="mb-0">
                  <li>Always verify patient addresses before creating records</li>
                  <li>Store sensitive medical data securely via IPFS</li>
                  <li>Only patients and their assigned doctors can view records</li>
                  <li>Records are immutable once created on blockchain</li>
                </ul>
              </Alert>
            </Card.Body>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard;