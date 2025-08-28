import React, { useState, useEffect } from 'react';
import { Card, Button, Form, Alert, ListGroup, Badge, Spinner } from 'react-bootstrap';

// AdminDashboard component to manage doctors in the system
const AdminDashboard = ({ web3, account, contract }) => {
  // State variables
  const [doctorAddress, setDoctorAddress] = useState(''); // input field for doctor address
  const [loading, setLoading] = useState(false); // show loading spinner during blockchain calls
  const [message, setMessage] = useState({ type: '', text: '' }); // feedback messages for user
  const [authorizedDoctors, setAuthorizedDoctors] = useState([]); // list of authorized doctors
  const [allDoctorEvents, setAllDoctorEvents] = useState([]); // (optional) events history from blockchain
  const [checkAddress, setCheckAddress] = useState(''); // input field for checking doctor status
  const [contractStats, setContractStats] = useState({
    totalRecords: 0,
    totalDoctors: 0,
    adminAddress: ''
  });

  // When component mounts or contract/account changes, load data from blockchain
  useEffect(() => {
    if (contract && account) {
      loadAuthorizedDoctors();
      // loadDoctorEvents(); // left as optional
      loadContractStats();
    }
  }, [contract, account]);

  // 🔹 Fetch authorized doctors from blockchain
  const loadAuthorizedDoctors = async () => {
    try {
      console.log('Loading authorized doctors from contract...');
      const doctors = await contract.methods.getAuthorizedDoctors().call(); // read-only call
      console.log('Authorized doctors from contract:', doctors);
      setAuthorizedDoctors(doctors);
    } catch (error) {
      console.error('Error loading authorized doctors:', error);
      setMessage({ 
        type: 'danger', 
        text: 'Error loading authorized doctors from contract' 
      });
    }
  };

  // 🔹 Fetch contract statistics like record count, admin address, total doctors
  const loadContractStats = async () => {
    try {
      const recordCount = await contract.methods.recordCount().call(); // total medical records
      const adminAddress = await contract.methods.admin().call(); // contract admin
      const doctors = await contract.methods.getAuthorizedDoctors().call(); // list of doctors
      
      setContractStats({
        totalRecords: recordCount,
        totalDoctors: doctors.length,
        adminAddress: adminAddress
      });
    } catch (error) {
      console.error('Error loading contract stats:', error);
    }
  };

  // 🔹 Function to authorize a new doctor
  const authorizeDoctor = async (e) => {
    e.preventDefault(); // prevent form reload

    // Validate Ethereum address
    if (!web3.utils.isAddress(doctorAddress)) {
      setMessage({ type: 'danger', text: 'Please enter a valid Ethereum address' });
      return;
    }

    try {
      setLoading(true);
      setMessage({ type: '', text: '' });

      // Check if doctor is already authorized
      const isAlreadyAuthorized = await contract.methods.isAuthorizedDoctor(doctorAddress).call();
      if (isAlreadyAuthorized) {
        setMessage({ type: 'warning', text: 'Doctor is already authorized' });
        setLoading(false);
        return;
      }

      // Estimate gas before sending transaction
      const gasEstimate = await contract.methods.authorizeDoctor(doctorAddress).estimateGas({ from: account });
      
      // Send transaction to blockchain (costs gas)
      const result = await contract.methods.authorizeDoctor(doctorAddress).send({
        from: account,
        gas: Math.floor(Number(gasEstimate) * 1.2) // add 20% buffer for safety
      });

      console.log('Doctor authorized:', result);
      
      setMessage({ 
        type: 'success', 
        text: `Doctor ${doctorAddress} has been authorized successfully!` 
      });
      
      // Refresh UI data
      await Promise.all([
        loadAuthorizedDoctors(),
        // loadDoctorEvents(),
        loadContractStats()
      ]);
      
      // Clear input field
      setDoctorAddress('');

    } catch (error) {
      console.error('Error authorizing doctor:', error);
      setMessage({ 
        type: 'danger', 
        text: `Error: ${error.message || 'Failed to authorize doctor'}` 
      });
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Function to revoke a doctor’s authorization
  const revokeDoctor = async (address) => {
    try {
      setLoading(true);
      setMessage({ type: '', text: '' });

      // First check if doctor is authorized
      const isAuthorized = await contract.methods.isAuthorizedDoctor(address).call();
      if (!isAuthorized) {
        setMessage({ type: 'warning', text: 'Doctor is not currently authorized' });
        setLoading(false);
        return;
      }

      // Estimate gas
      const gasEstimate = await contract.methods.revokeDoctor(address).estimateGas({ from: account });
      
      // Send revoke transaction
      const result = await contract.methods.revokeDoctor(address).send({
        from: account,
        gas: Math.floor(Number(gasEstimate) * 1.2)
      });

      console.log('Doctor revoked:', result);
      
      setMessage({ 
        type: 'success', 
        text: `Doctor ${address} has been revoked successfully!` 
      });
      
      // Refresh data
      await Promise.all([
        loadAuthorizedDoctors(),
        // loadDoctorEvents(),
        loadContractStats()
      ]);

    } catch (error) {
      console.error('Error revoking doctor:', error);
      setMessage({ 
        type: 'danger', 
        text: `Error: ${error.message || 'Failed to revoke doctor'}` 
      });
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Function to check if a given address is an authorized doctor
  const checkDoctorStatus = async () => {
    if (!checkAddress || !web3.utils.isAddress(checkAddress)) {
      setMessage({ type: 'danger', text: 'Please enter a valid address to check' });
      return;
    }

    try {
      const isAuthorized = await contract.methods.isAuthorizedDoctor(checkAddress).call();
      setMessage({ 
        type: 'info', 
        text: `Address ${checkAddress} is ${isAuthorized ? 'AUTHORIZED' : 'NOT AUTHORIZED'} as a doctor` 
      });
    } catch (error) {
      console.error('Error checking doctor status:', error);
      setMessage({ type: 'danger', text: 'Error checking doctor status' });
    }
  };

  // 🔹 Refresh dashboard data (doctors + stats)
  const refreshData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadAuthorizedDoctors(),
        // loadDoctorEvents(),
        loadContractStats()
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Admin Dashboard</h2>
        <Button variant="outline-primary" onClick={refreshData} disabled={loading}>
          {loading ? <Spinner size="sm" className="me-2" /> : null}
          Refresh
        </Button>
      </div>
      
      {/* Contract Stats Row */}
      <div className="row mb-4">
        <div className="col-md-4">
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-primary">{contractStats.totalRecords}</h3>
              <p className="mb-0">Total Records</p>
            </Card.Body>
          </Card>
        </div>
        <div className="col-md-4">
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-success">{contractStats.totalDoctors}</h3>
              <p className="mb-0">Authorized Doctors</p>
            </Card.Body>
          </Card>
        </div>
        <div className="col-md-4">
          <Card className="text-center">
            <Card.Body>
              <h6 className="text-muted mb-1">Admin Address</h6>
              <p className="mb-0 small font-monospace">
                {contractStats.adminAddress ? 
                  `${contractStats.adminAddress.slice(0, 6)}...${contractStats.adminAddress.slice(-4)}` 
                  : 'Loading...'}
              </p>
              <Badge bg={account?.toLowerCase() === contractStats.adminAddress?.toLowerCase() ? 'success' : 'warning'}>
                {account?.toLowerCase() === contractStats.adminAddress?.toLowerCase() ? 'You are Admin' : 'Not Admin'}
              </Badge>
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

      <div className="row">
        {/* Authorize Doctor Card */}
        <div className="col-md-6 mb-4">
          <Card>
            <Card.Header>
              <h5>Authorize Doctor</h5>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={authorizeDoctor}>
                <Form.Group className="mb-3">
                  <Form.Label>Doctor's Ethereum Address</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="0x..."
                    value={doctorAddress}
                    onChange={(e) => setDoctorAddress(e.target.value)}
                    disabled={loading}
                  />
                </Form.Group>
                <Button 
                  variant="primary" 
                  type="submit" 
                  disabled={loading || !doctorAddress || account?.toLowerCase() !== contractStats.adminAddress?.toLowerCase()}
                >
                  {loading ? (
                    <>
                      <Spinner
                        as="span"
                        animation="border"
                        size="sm"
                        role="status"
                        aria-hidden="true"
                        className="me-2"
                      />
                      Authorizing...
                    </>
                  ) : (
                    'Authorize Doctor'
                  )}
                </Button>
                {account?.toLowerCase() !== contractStats.adminAddress?.toLowerCase() && (
                  <div className="text-danger small mt-2">
                    Only admin can authorize doctors
                  </div>
                )}
              </Form>
            </Card.Body>
          </Card>
        </div>

        {/* Check Doctor Status Card */}
        <div className="col-md-6 mb-4">
          <Card>
            <Card.Header>
              <h5>Check Doctor Status</h5>
            </Card.Header>
            <Card.Body>
              <Form.Group className="mb-3">
                <Form.Label>Doctor's Address</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="0x..."
                  value={checkAddress}
                  onChange={(e) => setCheckAddress(e.target.value)}
                />
              </Form.Group>
              <Button 
                variant="info" 
                onClick={checkDoctorStatus}
                disabled={!checkAddress || loading}
              >
                Check Status
              </Button>
            </Card.Body>
          </Card>
        </div>
      </div>

      {/* Authorized Doctors List Card */}
      <div className="row">
        <div className="col-12">
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Authorized Doctors</h5>
              <Badge bg="primary">{authorizedDoctors.length} Active</Badge>
            </Card.Header>
            <Card.Body>
              {!contract ? (
                <div className="text-center text-muted py-4">
                  <p>Contract not connected.</p>
                  <small>Please ensure your wallet is connected and contract is loaded.</small>
                </div>
              ) : authorizedDoctors.length === 0 ? (
                <div className="text-center text-muted py-4">
                  <p>No authorized doctors found.</p>
                  <small>Doctors you authorize will appear here.</small>
                  <Button 
                    variant="outline-primary" 
                    size="sm" 
                    className="mt-2"
                    onClick={loadAuthorizedDoctors}
                    disabled={loading}
                  >
                    Refresh List
                  </Button>
                </div>
              ) : (
                <ListGroup variant="flush">
                  {authorizedDoctors.map((doctor, index) => (
                    <ListGroup.Item 
                      key={doctor} 
                      className="d-flex justify-content-between align-items-center"
                    >
                      <div>
                        <div className="fw-bold">
                          Doctor #{index + 1}
                        </div>
                        <div className="text-muted small font-monospace">
                          {doctor}
                        </div>
                      </div>
                      <div>
                        <Badge bg="success" className="me-2">Active</Badge>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => revokeDoctor(doctor)}
                          disabled={loading || account?.toLowerCase() !== contractStats.adminAddress?.toLowerCase()}
                        >
                          Revoke
                        </Button>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </Card.Body>
          </Card>
        </div>
      </div>

      {/* Recent Activity Card */}
      {allDoctorEvents.length > 0 && (
        <div className="row mt-4">
          <div className="col-12">
            <Card>
              <Card.Header>
                <h5 className="mb-0">Recent Doctor Management Activity</h5>
              </Card.Header>
              <Card.Body>
                <ListGroup variant="flush" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {allDoctorEvents.slice().reverse().slice(0, 10).map((event, index) => (
                    <ListGroup.Item key={`${event.blockNumber}-${event.logIndex}`}>
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <Badge 
                            bg={event.event === 'DoctorAuthorized' ? 'success' : 'warning'}
                            className="me-2"
                          >
                            {event.event === 'DoctorAuthorized' ? 'Authorized' : 'Revoked'}
                          </Badge>
                          <span className="text-muted small font-monospace">
                            {event.returnValues.doctor}
                          </span>
                        </div>
                        <small className="text-muted">
                          Block #{event.blockNumber}
                        </small>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              </Card.Body>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;