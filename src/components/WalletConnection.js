import React from 'react';
import { Card, Button, Spinner, Alert } from 'react-bootstrap';

const WalletConnection = ({ onConnect, loading }) => {
  return (
    <div className="row justify-content-center">
      <div className="col-md-6">
        <Card>
          <Card.Header className="text-center">
            <h3>🔐 Connect Your Wallet</h3>
          </Card.Header>
          <Card.Body className="text-center">
            

            
            <Button 
              variant="primary" 
              size="lg" 
              onClick={onConnect}
              disabled={loading}
              className="w-100"
            >
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Connecting...
                </>
              ) : (
                <>
                  🦊 Connect MetaMask
                </>
              )}
            </Button>

          

          </Card.Body>
        </Card>

       
      </div>
    </div>
  );
};

export default WalletConnection;