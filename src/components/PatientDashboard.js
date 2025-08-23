import React, { useState, useEffect } from 'react';
import { Card, Button, Alert, Table, Modal, Badge, Spinner, Tab, Tabs, Form } from 'react-bootstrap';
import { uploadToIPFS, getFromIPFS } from '../services/ipfsService';

const PatientDashboard = ({ web3, account, contract }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [patientRecords, setPatientRecords] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [ipfsData, setIpfsData] = useState('');
  const [updateData, setUpdateData] = useState({
    notes: '',
    symptoms: '',
    medications: ''
  });
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  useEffect(() => {
    loadPatientRecords();
  }, []);

  const loadPatientRecords = async () => {
    try {
      setLoading(true);
      
      // Get record IDs for this patient
      const recordIds = await contract.methods.getPatientRecords(account).call();
      
      const records = [];
      for (let id of recordIds) {
        try {
          const record = await contract.methods.getRecord(id).call();
          records.push(record);
        } catch (error) {
          console.log(`Could not load record ${id}:`, error.message);
        }
      }
      
      setPatientRecords(records);
    } catch (error) {
      console.error('Error loading patient records:', error);
      setMessage({ type: 'danger', text: 'Error loading your medical records' });
    } finally {
      setLoading(false);
    }
  };

  // Simulate IPFS retrieval
  const getFromIPFS = async (hash) => {
    try {
      // Simulate IPFS retrieval with mock data
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return {
        patientName: 'John Doe',
        diagnosis: 'Hypertension',
        treatment: 'Prescribed ACE inhibitors, lifestyle changes',
        notes: 'Patient advised to reduce salt intake, exercise regularly, and monitor blood pressure daily',
        date: '2024-01-15',
        doctor: 'Dr. Smith',
        ipfsHash: hash,
        vitals: {
          bloodPressure: '140/90 mmHg',
          heartRate: '78 bpm',
          temperature: '98.6°F',
          weight: '175 lbs'
        }
      };
    } catch (error) {
      throw new Error('IPFS retrieval failed: ' + error.message);
    }
  };



  const viewRecord = async (record) => {
    try {
      setLoading(true);
      setSelectedRecord(record);
      
      // Get data from IPFS (simulated)
      const ipfsData = await getFromIPFS(record.ipfsHash);
      setIpfsData(JSON.stringify(ipfsData, null, 2));
      
      setShowModal(true);
    } catch (error) {
      setMessage({ type: 'danger', text: 'Error loading record data from IPFS' });
    } finally {
      setLoading(false);
    }
  };

  const openUpdateModal = async (record) => {
    setSelectedRecord(record);
    setUpdateData({
      notes: '',
      symptoms: '',
      medications: ''
    });
    setShowUpdateModal(true);
  };

  const updateRecord = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setMessage({ type: '', text: '' });

      // Get existing data from IPFS
      const existingData = await getFromIPFS(selectedRecord.ipfsHash);
      
      // Merge with patient updates
      const updatedData = {
        ...existingData,
        patientUpdates: {
          ...updateData,
          timestamp: Date.now(),
          updatedBy: account
        }
      };

      // Upload updated data to IPFS
      setMessage({ type: 'info', text: 'Uploading updated information to IPFS...' });
      const newIpfsHash = await uploadToIPFS(updatedData);

      // Update record on blockchain
      setMessage({ type: 'info', text: 'Updating record on blockchain...' });
      
      const gasEstimate = await contract.methods.updateRecord(selectedRecord.id, newIpfsHash).estimateGas({ from: account });
      
      await contract.methods.updateRecord(selectedRecord.id, newIpfsHash).send({
        from: account,
        gas: Math.floor(gasEstimate * 1.2)
      });

      setMessage({ 
        type: 'success', 
        text: 'Record updated successfully with your additional information!' 
      });

      setShowUpdateModal(false);
      await loadPatientRecords();

    } catch (error) {
      console.error('Error updating record:', error);
      setMessage({ 
        type: 'danger', 
        text: `Error: ${error.message || 'Failed to update record'}` 
      });
    } finally {
      setLoading(false);
    }
  };

  const deactivateRecord = async (recordId) => {
    if (!window.confirm('Are you sure you want to deactivate this record? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      setMessage({ type: '', text: '' });

      const gasEstimate = await contract.methods.deactivateRecord(recordId).estimateGas({ from: account });
      
      await contract.methods.deactivateRecord(recordId).send({
        from: account,
        gas: Math.floor(gasEstimate * 1.2)
      });

      setMessage({ type: 'success', text: 'Record deactivated successfully' });
      await loadPatientRecords();

    } catch (error) {
      console.error('Error deactivating record:', error);
      setMessage({ type: 'danger', text: 'Error deactivating record' });
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address) => {
    return `${address.substring(0, 6)}...${address.substring(38)}`;
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const downloadRecord = (record) => {
    const recordData = {
      recordId: record.id,
      patient: record.patient,
      doctor: record.doctor,
      ipfsHash: record.ipfsHash,
      timestamp: formatTimestamp(record.timestamp),
      isActive: record.isActive
    };

    const dataStr = JSON.stringify(recordData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `medical_record_${record.id}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div>
      <h2 className="mb-4">👤 Patient Dashboard</h2>
      
      {message.text && (
        <Alert 
          variant={message.type} 
          dismissible 
          onClose={() => setMessage({ type: '', text: '' })}
        >
          {message.text}
        </Alert>
      )}

      <Tabs defaultActiveKey="records" id="patient-tabs" className="mb-4">
        {/* Medical Records Tab */}
        <Tab eventKey="records" title={`📋 My Records (${patientRecords.length})`}>
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5>My Medical Records</h5>
              <Button 
                variant="outline-primary" 
                size="sm"
                onClick={loadPatientRecords}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-1" />
                    Loading...
                  </>
                ) : (
                  <>🔄 Refresh</>
                )}
              </Button>
            </Card.Header>
            <Card.Body>
              {loading && patientRecords.length === 0 ? (
                <div className="text-center">
                  <Spinner animation="border" />
                  <p className="mt-2">Loading your medical records...</p>
                </div>
              ) : patientRecords.length === 0 ? (
                <Alert variant="info">
                  <h6>No Medical Records Found</h6>
                  <p>You don't have any medical records yet. When a doctor creates a record for you, it will appear here.</p>
                  <p><strong>Your Address:</strong> <code>{account}</code></p>
                  <p className="mb-0"><em>Share this address with your healthcare provider to receive medical records.</em></p>
                </Alert>
              ) : (
                <Table responsive striped>
                  <thead>
                    <tr>
                      <th>Record ID</th>
                      <th>Doctor</th>
                      <th>IPFS Hash</th>
                      <th>Date Created</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patientRecords.map((record, index) => (
                      <tr key={index}>
                        <td><code>{record.id}</code></td>
                        <td><code>{formatAddress(record.doctor)}</code></td>
                        <td><code>{formatAddress(record.ipfsHash)}</code></td>
                        <td>{formatTimestamp(record.timestamp)}</td>
                        <td>
                          <Badge bg={record.isActive ? 'success' : 'danger'}>
                            {record.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td>
                          <div className="btn-group" role="group">
                            <Button 
                              variant="outline-primary" 
                              size="sm"
                              onClick={() => viewRecord(record)}
                              disabled={loading}
                            >
                              👁️ View
                            </Button>
                            {record.isActive && (
                              <>
                                <Button 
                                  variant="outline-success" 
                                  size="sm"
                                  onClick={() => openUpdateModal(record)}
                                  disabled={loading}
                                >
                                  ✏️ Update
                                </Button>
                                <Button 
                                  variant="outline-info" 
                                  size="sm"
                                  onClick={() => downloadRecord(record)}
                                >
                                  💾 Download
                                </Button>
                                <Button 
                                  variant="outline-danger" 
                                  size="sm"
                                  onClick={() => deactivateRecord(record.id)}
                                  disabled={loading}
                                >
                                  🚫 Deactivate
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Tab>

        {/* Health Summary Tab */}
        <Tab eventKey="summary" title="📊 Health Summary">
          <Card>
            <Card.Header>
              <h5>Health Summary & Statistics</h5>
            </Card.Header>
            <Card.Body>
              <div className="row">
                <div className="col-md-3">
                  <Card className="text-center bg-light">
                    <Card.Body>
                      <h4 className="text-primary">{patientRecords.length}</h4>
                      <p className="mb-0">Total Records</p>
                    </Card.Body>
                  </Card>
                </div>
                <div className="col-md-3">
                  <Card className="text-center bg-light">
                    <Card.Body>
                      <h4 className="text-success">{patientRecords.filter(r => r.isActive).length}</h4>
                      <p className="mb-0">Active Records</p>
                    </Card.Body>
                  </Card>
                </div>
                <div className="col-md-3">
                  <Card className="text-center bg-light">
                    <Card.Body>
                      <h4 className="text-warning">{new Set(patientRecords.map(r => r.doctor)).size}</h4>
                      <p className="mb-0">Healthcare Providers</p>
                    </Card.Body>
                  </Card>
                </div>
                <div className="col-md-3">
                  <Card className="text-center bg-light">
                    <Card.Body>
                      <h4 className="text-info">
                        {patientRecords.length > 0 ? 
                          Math.floor((Date.now() - Math.min(...patientRecords.map(r => r.timestamp * 1000))) / (1000 * 60 * 60 * 24)) + ' days'
                          : '0 days'
                        }
                      </h4>
                      <p className="mb-0">Record History</p>
                    </Card.Body>
                  </Card>
                </div>
              </div>

              {patientRecords.length > 0 && (
                <div className="mt-4">
                  <h6>Recent Activity</h6>
                  <ul className="list-group">
                    {patientRecords
                      .sort((a, b) => b.timestamp - a.timestamp)
                      .slice(0, 5)
                      .map((record, index) => (
                        <li key={index} className="list-group-item d-flex justify-content-between align-items-center">
                          <div>
                            <strong>Record #{record.id}</strong> - Created by {formatAddress(record.doctor)}
                            <br />
                            <small className="text-muted">{formatTimestamp(record.timestamp)}</small>
                          </div>
                          <Badge bg={record.isActive ? 'success' : 'danger'}>
                            {record.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>

      {/* Record Details Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>📋 Medical Record Details</Modal.Title>
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
                  <strong>Healthcare Provider:</strong><br />
                  <code>{selectedRecord.doctor}</code>
                </div>
                <div className="col-md-6">
                  <strong>Date Created:</strong><br />
                  {formatTimestamp(selectedRecord.timestamp)}
                </div>
              </div>

              <div className="mb-3">
                <strong>IPFS Hash:</strong><br />
                <code>{selectedRecord.ipfsHash}</code>
              </div>

              <div className="mb-3">
                <strong>Medical Information (from IPFS):</strong>
                <pre className="bg-light p-3 rounded mt-2" style={{maxHeight: '300px', overflow: 'auto'}}>
                  {ipfsData}
                </pre>
              </div>

              <Alert variant="info">
                <strong>🔒 Privacy Notice:</strong> Your medical data is stored securely on IPFS and can only be accessed by you and your healthcare providers.
              </Alert>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Close
          </Button>
          {selectedRecord && selectedRecord.isActive && (
            <Button variant="primary" onClick={() => {
              setShowModal(false);
              openUpdateModal(selectedRecord);
            }}>
              ✏️ Add Information
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      {/* Update Record Modal */}
      <Modal show={showUpdateModal} onHide={() => setShowUpdateModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>✏️ Add Your Information</Modal.Title>
        </Modal.Header>
        <Form onSubmit={updateRecord}>
          <Modal.Body>
            <Alert variant="info">
              <strong>Patient Input:</strong> Add your own notes, symptoms, or medication updates to this record.
            </Alert>

            <Form.Group className="mb-3">
              <Form.Label>Additional Notes</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Add any additional notes about your condition, recovery, or observations..."
                value={updateData.notes}
                onChange={(e) => setUpdateData({...updateData, notes: e.target.value})}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Current Symptoms</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Describe any current symptoms you're experiencing..."
                value={updateData.symptoms}
                onChange={(e) => setUpdateData({...updateData, symptoms: e.target.value})}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Medications & Side Effects</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="List current medications, dosages, and any side effects..."
                value={updateData.medications}
                onChange={(e) => setUpdateData({...updateData, medications: e.target.value})}
              />
            </Form.Group>

            <Alert variant="warning">
              <strong>⚠️ Important:</strong> This information will be added to your permanent medical record on the blockchain. Only add information you want to share with your healthcare providers.
            </Alert>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowUpdateModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Updating...
                </>
              ) : (
                'Update Record'
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Patient Info */}
      <div className="row mt-4">
        <div className="col-12">
          <Card>
            <Card.Header>
              <h5>ℹ️ Patient Information & Privacy</h5>
            </Card.Header>
            <Card.Body>
              <div className="row">
                <div className="col-md-6">
                  <p><strong>Your Address:</strong> <code>{account}</code></p>
                  <p><strong>Total Records:</strong> {patientRecords.length}</p>
                  <p><strong>Active Records:</strong> {patientRecords.filter(r => r.isActive).length}</p>
                  <p><strong>Network:</strong> Polygon Amoy Testnet</p>
                </div>
                <div className="col-md-6">
                  <Alert variant="success" className="mb-0">
                    <strong>🔐 Your Data is Secure:</strong>
                    <ul className="mb-0 mt-2">
                      <li>Only you and your doctors can access your records</li>
                      <li>Medical data is encrypted and stored on IPFS</li>
                      <li>Blockchain ensures data integrity and immutability</li>
                      <li>You control who can see your information</li>
                    </ul>
                  </Alert>
                </div>
              </div>

              <hr />

              <div className="row">
                <div className="col-12">
                  <h6>🏥 How to Share Your Address with Healthcare Providers</h6>
                  <div className="bg-light p-3 rounded">
                    <p className="mb-2">Share this address with your doctor to receive medical records:</p>
                    <div className="input-group">
                      <input 
                        type="text" 
                        className="form-control" 
                        value={account} 
                        readOnly 
                      />
                      <Button 
                        variant="outline-secondary"
                        onClick={() => {
                          navigator.clipboard.writeText(account);
                          setMessage({ type: 'success', text: 'Address copied to clipboard!' });
                        }}
                      >
                        📋 Copy
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <Alert variant="warning" className="mt-3">
                <strong>⚠️ Important Notes:</strong>
                <ul className="mb-0">
                  <li>Keep your private key secure - never share it with anyone</li>
                  <li>Always verify doctor addresses before sharing sensitive information</li>
                  <li>You can deactivate records if needed, but data remains on blockchain</li>
                  <li>Download important records for offline backup</li>
                </ul>
              </Alert>
            </Card.Body>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;