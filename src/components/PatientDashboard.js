import React, { useState, useEffect } from 'react';
import { Card, Button, Alert, ListGroup, Badge, Spinner, Modal, Form, Row, Col } from 'react-bootstrap';

const PatientDashboard = ({ web3, account, contract }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [patientRecords, setPatientRecords] = useState([]);
  const [recordDetails, setRecordDetails] = useState({});
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [loadingRecords, setLoadingRecords] = useState({});

  useEffect(() => {
    if (contract && account) {
      loadPatientRecords();
    }
  }, [contract, account]);

  // Load all patient records for current account
  const loadPatientRecords = async () => {
    try {
      setLoading(true);
      console.log('Loading records for patient:', account);
      
      // Get all record IDs for this patient
      const recordIds = await contract.methods.getPatientRecords(account).call({ from: account });
      console.log('Patient record IDs:', recordIds);
      
      if (recordIds.length === 0) {
        setPatientRecords([]);
        setLoading(false);
        return;
      }

      // Load details for each record
      const recordsWithDetails = [];
      for (const recordId of recordIds) {
        try {
          // Check if record exists and is active
          const recordExists = await contract.methods.recordExistsCheck(recordId).call();
          
          if (recordExists) {
            // Get record details
            const record = await contract.methods.getRecord(recordId).call({ from: account });
            
            recordsWithDetails.push({
              id: record.id,
              patient: record.patient,
              doctor: record.doctor,
              ipfsHash: record.ipfsHash,
              timestamp: record.timestamp,
              isActive: record.isActive,
              formattedDate: new Date(parseInt(record.timestamp) * 1000).toLocaleString()
            });
          }
        } catch (error) {
          console.error(`Error loading record ${recordId}:`, error);
          // Skip this record but continue with others
        }
      }

      // Sort records by timestamp (newest first)
      recordsWithDetails.sort((a, b) => parseInt(b.timestamp) - parseInt(a.timestamp));
      
      setPatientRecords(recordsWithDetails);
      console.log('Loaded patient records:', recordsWithDetails);
      
    } catch (error) {
      console.error('Error loading patient records:', error);
      setMessage({ 
        type: 'danger', 
        text: `Error loading records: ${error.message}` 
      });
    } finally {
      setLoading(false);
    }
  };

  // View detailed record information
  const viewRecordDetails = async (recordId) => {
    try {
      setLoadingRecords(prev => ({ ...prev, [recordId]: true }));
      
      const record = await contract.methods.getRecord(recordId).call({ from: account });
      
      setSelectedRecord({
        id: record.id,
        patient: record.patient,
        doctor: record.doctor,
        ipfsHash: record.ipfsHash,
        timestamp: record.timestamp,
        isActive: record.isActive,
        formattedDate: new Date(parseInt(record.timestamp) * 1000).toLocaleString(),
        formattedTime: new Date(parseInt(record.timestamp) * 1000).toLocaleTimeString()
      });
      
      setShowRecordModal(true);
      
    } catch (error) {
      console.error('Error viewing record details:', error);
      setMessage({ 
        type: 'danger', 
        text: `Error viewing record: ${error.message}` 
      });
    } finally {
      setLoadingRecords(prev => ({ ...prev, [recordId]: false }));
    }
  };

  // Deactivate a record
  const deactivateRecord = async (recordId) => {
    try {
      setLoading(true);
      setMessage({ type: '', text: '' });

      // Estimate gas
      const gasEstimate = await contract.methods.deactivateRecord(recordId).estimateGas({ from: account });
      
      // Send transaction
      await contract.methods.deactivateRecord(recordId).send({
        from: account,
        gas: Math.floor(gasEstimate * 1.2)
      });

      setMessage({ 
        type: 'success', 
        text: `Record #${recordId} has been deactivated successfully!` 
      });
      
      // Reload records
      await loadPatientRecords();
      setShowRecordModal(false);
      
    } catch (error) {
      console.error('Error deactivating record:', error);
      setMessage({ 
        type: 'danger', 
        text: `Error deactivating record: ${error.message}` 
      });
    } finally {
      setLoading(false);
    }
  };

  // Copy IPFS hash to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setMessage({ type: 'success', text: 'IPFS hash copied to clipboard!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    });
  };

  // Refresh patient records
  const refreshRecords = () => {
    loadPatientRecords();
  };

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>My Medical Records</h2>
        <Button variant="outline-primary" onClick={refreshRecords} disabled={loading}>
          {loading ? <Spinner size="sm" className="me-2" /> : null}
          Refresh
        </Button>
      </div>

      {/* Patient Info Card */}
      <div className="row mb-4">
        <div className="col-12">
          <Card>
            <Card.Body>
              <div className="row align-items-center">
                <div className="col-md-8">
                  <h5 className="mb-1">Patient Information</h5>
                  <p className="text-muted mb-0 font-monospace small">{account}</p>
                </div>
                <div className="col-md-4 text-end">
                  <Badge bg="primary" className="me-2">
                    {patientRecords.length} Records
                  </Badge>
                  <Badge bg="success">
                    {patientRecords.filter(r => r.isActive).length} Active
                  </Badge>
                </div>
              </div>
            </Card.Body>
          </Card>
        </div>
      </div>

      {/* Message Alert */}
      {message.text && (
        <Alert variant={message.type} className="mb-3">
          {message.text}
        </Alert>
      )}

      {/* Records List */}
      <div className="row">
        <div className="col-12">
          <Card>
            <Card.Header>
              <h5 className="mb-0">Medical Records</h5>
            </Card.Header>
            <Card.Body>
              {loading ? (
                <div className="text-center py-4">
                  <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </Spinner>
                  <p className="mt-2 text-muted">Loading your medical records...</p>
                </div>
              ) : !contract ? (
                <div className="text-center text-muted py-4">
                  <p>Contract not connected.</p>
                  <small>Please ensure your wallet is connected and contract is loaded.</small>
                </div>
              ) : patientRecords.length === 0 ? (
                <div className="text-center text-muted py-4">
                  <div className="mb-3">
                    <i className="fas fa-file-medical fa-3x text-muted"></i>
                  </div>
                  <h5>No Medical Records Found</h5>
                  <p>You don't have any medical records yet.</p>
                  <small className="text-muted">
                    Records created by authorized doctors will appear here.
                  </small>
                </div>
              ) : (
                <ListGroup variant="flush">
                  {patientRecords.map((record) => (
                    <ListGroup.Item key={record.id}>
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="flex-grow-1">
                          <div className="d-flex align-items-center mb-2">
                            <h6 className="mb-0 me-2">Record #{record.id}</h6>
                            <Badge bg={record.isActive ? 'success' : 'secondary'}>
                              {record.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          
                          <Row className="mb-2">
                            <Col md={6}>
                              <small className="text-muted d-block">Doctor Address:</small>
                              <span className="font-monospace small">
                                {record.doctor.slice(0, 10)}...{record.doctor.slice(-8)}
                              </span>
                            </Col>
                            <Col md={6}>
                              <small className="text-muted d-block">Created:</small>
                              <span className="small">{record.formattedDate}</span>
                            </Col>
                          </Row>

                          <div className="mb-2">
                            <small className="text-muted d-block">IPFS Hash:</small>
                            <div className="d-flex align-items-center">
                              <span className="font-monospace small text-truncate me-2" style={{maxWidth: '300px'}}>
                                {record.ipfsHash}
                              </span>
                              <Button
                                variant="outline-secondary"
                                size="sm"
                                onClick={() => copyToClipboard(record.ipfsHash)}
                                title="Copy IPFS Hash"
                              >
                                <i className="fas fa-copy"></i>
                              </Button>
                            </div>
                          </div>
                        </div>
                        
                        <div className="ms-3">
                          <Button
                            variant="primary"
                            size="sm"
                            className="me-2"
                            onClick={() => viewRecordDetails(record.id)}
                            disabled={loadingRecords[record.id]}
                          >
                            {loadingRecords[record.id] ? (
                              <Spinner size="sm" />
                            ) : (
                              'View Details'
                            )}
                          </Button>
                        </div>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </Card.Body>
          </Card>
        </div>
      </div>

      {/* Record Details Modal */}
      <Modal show={showRecordModal} onHide={() => setShowRecordModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Medical Record Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedRecord && (
            <div>
              <Row className="mb-3">
                <Col md={6}>
                  <strong>Record ID:</strong>
                  <p className="mb-0">#{selectedRecord.id}</p>
                </Col>
                <Col md={6}>
                  <strong>Status:</strong>
                  <p className="mb-0">
                    <Badge bg={selectedRecord.isActive ? 'success' : 'secondary'}>
                      {selectedRecord.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </p>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col md={6}>
                  <strong>Patient Address:</strong>
                  <p className="mb-0 font-monospace small">{selectedRecord.patient}</p>
                </Col>
                <Col md={6}>
                  <strong>Doctor Address:</strong>
                  <p className="mb-0 font-monospace small">{selectedRecord.doctor}</p>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col md={6}>
                  <strong>Created Date:</strong>
                  <p className="mb-0">{selectedRecord.formattedDate}</p>
                </Col>
                <Col md={6}>
                  <strong>Time:</strong>
                  <p className="mb-0">{selectedRecord.formattedTime}</p>
                </Col>
              </Row>

              <div className="mb-3">
                <strong>IPFS Hash:</strong>
                <div className="mt-2 p-2 bg-light rounded">
                  <code>{selectedRecord.ipfsHash}</code>
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    className="ms-2"
                    onClick={() => copyToClipboard(selectedRecord.ipfsHash)}
                  >
                    Copy
                  </Button>
                </div>
              </div>

              <div className="mb-3">
                <strong>Access Medical Data:</strong>
                <p className="text-muted small mb-2">
                  Use the IPFS hash above to access your medical data through an IPFS gateway or client.
                </p>
                <Button
                  variant="outline-info"
                  size="sm"
                  onClick={() => window.open(`https://ipfs.io/ipfs/${selectedRecord.ipfsHash}`, '_blank')}
                >
                  View on IPFS Gateway
                </Button>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          {selectedRecord && selectedRecord.isActive && (
            <Button
              variant="warning"
              onClick={() => deactivateRecord(selectedRecord.id)}
              disabled={loading}
            >
              {loading ? <Spinner size="sm" className="me-2" /> : null}
              Deactivate Record
            </Button>
          )}
          <Button variant="secondary" onClick={() => setShowRecordModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default PatientDashboard;