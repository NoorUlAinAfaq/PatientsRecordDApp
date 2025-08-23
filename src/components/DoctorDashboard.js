import React, { useState, useEffect } from 'react';
import { Card, Button, Form, Alert, Table, Modal, Badge, Spinner, Tab, Tabs, ListGroup, ProgressBar } from 'react-bootstrap';
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

  // NEW: file upload state
  const [files, setFiles] = useState([]); // Array<File>
  const [uploadProgress, setUploadProgress] = useState({}); // {filename: percent}
  const [selectedAttachment, setSelectedAttachment] = useState(null); // { name, cid, type }

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
      const isAuthorized = await contract.methods.isAuthorizedDoctor(account).call();
      if (!isAuthorized) {
        setMessage({
          type: 'warning',
          text: 'You are not authorized as a doctor. Please contact the admin to get authorized.'
        });
        setDoctorRecords([]);
        setLoading(false);
        return;
      }

      try {
        const recordIds = await contract.methods.getDoctorRecords(account).call({ from: account });
        if (!recordIds || recordIds.length === 0) {
          setDoctorRecords([]);
          setLoading(false);
          return;
        }

        const records = [];
        for (let i = 0; i < recordIds.length; i++) {
          const id = recordIds[i];
          try {
            const record = await contract.methods.getRecord(id).call({ from: account });
            records.push(record);
          } catch (recordError) {
            console.error(`Error loading record ${id}:`, recordError);
          }
        }
        setDoctorRecords(records);
        if (records.length === 0) {
          setMessage({
            type: 'info',
            text: `Found ${recordIds.length} record ID(s) but couldn't load the record details. Check console for errors.`
          });
        }
      } catch (getDoctorRecordsError) {
        console.error('Error calling getDoctorRecords:', getDoctorRecordsError);
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

  // ======== NEW: File upload helpers ========
  const handleFileChange = (e) => {
    const picked = Array.from(e.target.files || []);
    // De-duplicate by name + size + lastModified
    const key = (f) => `${f.name}-${f.size}-${f.lastModified}`;
    const existingKeys = new Set(files.map(key));
    const merged = [...files];
    for (const f of picked) if (!existingKeys.has(key(f))) merged.push(f);
    setFiles(merged);
  };

  const removeFile = (idx) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const gatewayUrl = (cid, path = '') => `https://ipfs.io/ipfs/${cid}${path ? `/${path}` : ''}`;

  // Upload each file to IPFS. We assume uploadFileToIPFS can accept a File/Blob and returns { cid | IpfsHash | Hash } or a string.
  const uploadAttachmentsToIPFS = async () => {
    if (!files.length) return [];
    const attachments = [];

    for (const f of files) {
      try {
        // Optional: optimistic progress
        setUploadProgress((p) => ({ ...p, [f.name]: 5 }));
        const res = await uploadToIPFS(f, {
          // Some ipfsService implementations support progress callbacks; if yours does, wire it here.
          onProgress: (pct) => setUploadProgress((p) => ({ ...p, [f.name]: Math.max(pct, 5) }))
        });

        const cid = (res && (res.cid || res.IpfsHash || res.Hash || res.hash)) || (typeof res === 'string' ? res : null);
        if (!cid) throw new Error('IPFS upload did not return a CID');

        attachments.push({
          name: f.name,
          type: f.type || 'application/octet-stream',
          size: f.size,
          cid
        });
        setUploadProgress((p) => ({ ...p, [f.name]: 100 }));
      } catch (e) {
        console.error('Failed to upload attachment', f.name, e);
        setMessage({ type: 'danger', text: `Failed to upload ${f.name}: ${e.message}` });
        throw e; // Bubble up to stop record creation
      }
    }

    return attachments;
  };

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

      // 1) Upload any attached files to IPFS
      let attachments = [];
      if (files.length) {
        setMessage({ type: 'info', text: `Uploading ${files.length} attachment(s) to IPFS...` });
        attachments = await uploadAttachmentsToIPFS();
      }

      // 2) Prepare the record manifest JSON
      const recordData = {
        ...medicalData,
        doctor: account,
        patient: patientAddress,
        timestamp: Date.now(),
        attachments, // [{ name, type, size, cid }]
        _schema: 'com.example.health.record.v1'
      };

      // 3) Upload manifest JSON to IPFS
      setMessage({ type: 'info', text: 'Uploading medical data (manifest) to IPFS...' });
      const ipfsHash = await uploadToIPFS(recordData);

      // 4) Save manifest CID on-chain
      setMessage({ type: 'info', text: 'Creating record on blockchain...' });
      const gasEstimate = await contract.methods.createRecord(patientAddress, ipfsHash).estimateGas({ from: account });

      const result = await contract.methods.createRecord(patientAddress, ipfsHash).send({
        from: account,
        gas: Math.floor(Number(gasEstimate) * 1.2)
      });

      // Persist created record id locally as backup
      let recordId;
      if (result.events && result.events.RecordCreated) {
        recordId = result.events.RecordCreated.returnValues.recordId;
      } else {
        const recordCountBigInt = await contract.methods.recordCount().call();
        recordId = recordCountBigInt.toString();
      }

      const existing = JSON.parse(localStorage.getItem(`doctorRecords_${account}`) || '[]');
      const idStr = recordId.toString();
      if (!existing.includes(idStr)) {
        existing.push(idStr);
        localStorage.setItem(`doctorRecords_${account}`, JSON.stringify(existing));
      }

      setMessage({ type: 'success', text: `✅ Patient record created successfully! Record ID: ${recordId}` });

      // Reset form & files
      setPatientAddress('');
      setMedicalData({ patientName: '', diagnosis: '', treatment: '', notes: '', date: new Date().toISOString().split('T')[0] });
      setFiles([]);
      setUploadProgress({});

      // Refresh list
      setTimeout(() => loadDoctorRecords(), 1200);
    } catch (error) {
      console.error('Error creating record:', error);
      setMessage({ type: 'danger', text: `Error: ${error.message || 'Failed to create patient record'}` });
    } finally {
      setLoading(false);
    }
  };

  // Enhanced viewRecord function with file-aware display
  const viewRecord = async (record) => {
    try {
      setLoading(true);
      setMessage({ type: '', text: '' });
      setSelectedRecord(record);

      if (!record.ipfsHash) throw new Error('No IPFS hash found for this record');

      setMessage({ type: 'info', text: 'Fetching record data from IPFS...' });
      const data = await getFromIPFS(record.ipfsHash);

      // If service returned raw text, keep it; otherwise pretty print JSON
      if (data && typeof data === 'object' && !data.rawText) {
        setIpfsData(JSON.stringify(data, null, 2));
      } else if (data && data.rawText) {
        setIpfsData(data.rawText);
      } else {
        setIpfsData(JSON.stringify(data, null, 2));
      }

      setMessage({ type: 'success', text: 'Record data loaded successfully' });
      setShowModal(true);
    } catch (error) {
      console.error('Error in viewRecord:', error);
      setMessage({ type: 'danger', text: `Error loading record data from IPFS: ${error.message}` });
      setIpfsData(JSON.stringify({ error: 'Failed to load IPFS data', message: error.message, ipfsHash: record.ipfsHash }, null, 2));
      setShowModal(true);
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    try {
      const timestampNumber = typeof timestamp === 'bigint' ? Number(timestamp) : Number(timestamp?.toString?.() ?? timestamp);
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

  const renderAttachmentsFromManifest = () => {
    try {
      const parsed = JSON.parse(ipfsData || '{}');
      const attachments = parsed.attachments || [];
      if (!attachments.length) return <p className="mb-0">No attachments uploaded for this record.</p>;

      return (
        <div>
          <Table responsive size="sm" className="align-middle">
            <thead>
              <tr>
                <th>#</th>
                <th>File</th>
                <th>Type</th>
                <th>Size</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {attachments.map((att, idx) => (
                <tr key={att.cid + idx}>
                  <td>{idx + 1}</td>
                  <td>{att.name}</td>
                  <td><code>{att.type}</code></td>
                  <td>{(att.size / 1024).toFixed(1)} KB</td>
                  <td className="d-flex gap-2">
                    <Button size="sm" variant="outline-primary" onClick={() => setSelectedAttachment(att)}>
                      Preview
                    </Button>
                    <a className="btn btn-sm btn-outline-secondary" href={gatewayUrl(att.cid)} target="_blank" rel="noreferrer">
                      Open
                    </a>
                    <a className="btn btn-sm btn-outline-success" href={gatewayUrl(att.cid)} download={att.name}>
                      Download
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>

          {selectedAttachment && (
            <div className="mt-3">
              <h6 className="mb-2">Preview: {selectedAttachment.name}</h6>
              {/^image\//.test(selectedAttachment.type) ? (
                <img src={gatewayUrl(selectedAttachment.cid)} alt={selectedAttachment.name} className="img-fluid rounded border" />
              ) : selectedAttachment.type === 'application/pdf' ? (
                <div className="ratio ratio-4x3 border rounded">
                  <iframe title={selectedAttachment.name} src={gatewayUrl(selectedAttachment.cid)} allow="fullscreen" />
                </div>
              ) : (
                <Alert variant="secondary" className="mb-0">Preview not supported. Use Open/Download.</Alert>
              )}
            </div>
          )}
        </div>
      );
    } catch (e) {
      return <Alert variant="warning">Unable to parse attachments from manifest.</Alert>;
    }
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
        <Alert variant={message.type} dismissible onClose={() => setMessage({ type: '', text: '' })}>
          {message.text}
        </Alert>
      )}

      <Tabs defaultActiveKey="create" id="doctor-tabs" className="mb-4">
        {/* Create Record Tab */}
        <Tab eventKey="create" title="📝 Create Record">
          <Card>
            <Card.Header className="d-flex align-items-center justify-content-between">
              <h5 className="mb-0">Create New Patient Record</h5>
              <Badge bg="success">Authorized Doctor</Badge>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={createPatientRecord}>
                <div className="row">
                  <div className="col-md-6">
                    <Form.Group className="mb-3">
                      <Form.Label>Patient Ethereum Address *</Form.Label>
                      <Form.Control type="text" placeholder="0x..." value={patientAddress} onChange={(e) => setPatientAddress(e.target.value)} required />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Patient Name *</Form.Label>
                      <Form.Control type="text" placeholder="Enter patient name" value={medicalData.patientName} onChange={(e) => setMedicalData({ ...medicalData, patientName: e.target.value })} required />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Date *</Form.Label>
                      <Form.Control type="date" value={medicalData.date} onChange={(e) => setMedicalData({ ...medicalData, date: e.target.value })} required />
                    </Form.Group>
                  </div>

                  <div className="col-md-6">
                    <Form.Group className="mb-3">
                      <Form.Label>Diagnosis *</Form.Label>
                      <Form.Control as="textarea" rows={3} placeholder="Enter diagnosis" value={medicalData.diagnosis} onChange={(e) => setMedicalData({ ...medicalData, diagnosis: e.target.value })} required />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Treatment *</Form.Label>
                      <Form.Control as="textarea" rows={3} placeholder="Enter treatment plan" value={medicalData.treatment} onChange={(e) => setMedicalData({ ...medicalData, treatment: e.target.value })} required />
                    </Form.Group>
                  </div>
                </div>

                <Form.Group className="mb-3">
                  <Form.Label>Additional Notes</Form.Label>
                  <Form.Control as="textarea" rows={3} placeholder="Enter additional notes (optional)" value={medicalData.notes} onChange={(e) => setMedicalData({ ...medicalData, notes: e.target.value })} />
                </Form.Group>

                {/* NEW: Attach medical reports */}
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Attach Medical Reports (PDF, images, lab results)</Form.Label>
                  <Form.Control type="file" multiple accept=".pdf,image/*,.csv,.txt,.doc,.docx" onChange={handleFileChange} />
                  {files.length > 0 && (
                    <div className="mt-3">
                      <Table responsive size="sm" className="align-middle">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>File</th>
                            <th>Type</th>
                            <th>Size</th>
                            <th>Upload</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {files.map((f, idx) => (
                            <tr key={`${f.name}-${idx}`}>
                              <td>{idx + 1}</td>
                              <td>{f.name}</td>
                              <td><code>{f.type || 'n/a'}</code></td>
                              <td>{(f.size / 1024).toFixed(1)} KB</td>
                              <td style={{ minWidth: 140 }}>
                                <ProgressBar now={uploadProgress[f.name] || 0} label={`${Math.round(uploadProgress[f.name] || 0)}%`} animated={Boolean(uploadProgress[f.name] && uploadProgress[f.name] < 100)} />
                              </td>
                              <td>
                                <Button size="sm" variant="outline-danger" onClick={() => removeFile(idx)}>Remove</Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                      <Alert variant="secondary" className="py-2 mb-0">
                        Files upload to IPFS happens on submit. Progress will appear above.
                      </Alert>
                    </div>
                  )}
                </Form.Group>

                <div className="d-grid">
                  <Button variant="primary" type="submit" disabled={loading} size="lg">
                    {loading ? (<><Spinner animation="border" size="sm" className="me-2" />Saving...</>) : '📋 Create Patient Record'}
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
              <Button variant="outline-primary" size="sm" onClick={loadDoctorRecords} className="me-2">🔄 Refresh</Button>
            </Card.Header>
            <Card.Body>
              {doctorRecords.length === 0 ? (
                <Alert variant="info">You haven't created any patient records yet. Use the "Create Record" tab to add your first record.</Alert>
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
                          <Button variant="outline-primary" size="sm" onClick={() => viewRecord(record)}>
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
      <Modal show={showModal} onHide={() => { setSelectedAttachment(null); setShowModal(false); }} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>📋 Patient Record Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedRecord && (
            <div>
              <div className="row mb-3">
                <div className="col-md-6"><strong>Record ID:</strong> {selectedRecord.id}</div>
                <div className="col-md-6"><strong>Status:</strong> <Badge bg={selectedRecord.isActive ? 'success' : 'danger'}>{selectedRecord.isActive ? 'Active' : 'Inactive'}</Badge></div>
              </div>
              <div className="row mb-3">
                <div className="col-md-6"><strong>Patient:</strong><br /><code>{selectedRecord.patient}</code></div>
                <div className="col-md-6"><strong>Created:</strong><br />{formatTimestamp(selectedRecord.timestamp)}</div>
              </div>
              <div className="mb-3"><strong>IPFS Hash (manifest):</strong><br /><code>{selectedRecord.ipfsHash}</code></div>

              <div className="mb-3">
                <strong>Medical Data (from IPFS):</strong>
                <pre className="bg-light p-3 rounded mt-2" style={{ maxHeight: 260, overflow: 'auto' }}>{ipfsData}</pre>
              </div>

              <div className="mb-2">
                <strong>Attachments:</strong>
                <div className="mt-2">{renderAttachmentsFromManifest()}</div>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => { setSelectedAttachment(null); setShowModal(false); }}>Close</Button>
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
                  <li>Verify patient addresses before creating records</li>
                  <li>Attach lab results, scans, and PDFs as needed</li>
                  <li>Only patients and their assigned doctors can view records</li>
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
