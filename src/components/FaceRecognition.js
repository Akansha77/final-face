import React, { useRef, useEffect, useState } from 'react';
import * as faceapi from 'face-api.js';

const FaceRecognition = () => {
  const videoRef = useRef();
  const canvasRef = useRef();
  const [walletAddress, setWalletAddress] = useState('');
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentInProgress, setPaymentInProgress] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState([]);

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setWalletAddress(accounts[0]);
        alert(`✅ Wallet Connected: ${accounts[0]}`);
      } catch (error) {
        console.error('MetaMask connection error:', error);
        alert('❌ Failed to connect wallet.');
      }
    } else {
      alert('❌ MetaMask is not installed.');
    }
  };

  const startVideo = () => {
    navigator.mediaDevices
      .getUserMedia({ video: {} })
      .then((stream) => (videoRef.current.srcObject = stream))
      .catch((err) => console.error('Error accessing webcam:', err));
  };

  const loadModels = async () => {
    const MODEL_URL = '/models';
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
    await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
  };

  const persistUsers = (users) => {
    localStorage.setItem('face-users', JSON.stringify(users));
  };

  const persistHistory = (history) => {
    localStorage.setItem('payment-history', JSON.stringify(history));
  };

  useEffect(() => {
    const savedUsers = localStorage.getItem('face-users');
    const savedHistory = localStorage.getItem('payment-history');

    if (savedUsers) {
      const parsedUsers = JSON.parse(savedUsers);
      const converted = parsedUsers.map(user => ({
        walletAddress: user.walletAddress,
        descriptor: new Float32Array(user.descriptor)
      }));
      setRegisteredUsers(converted);
    }

    if (savedHistory) {
      setPaymentHistory(JSON.parse(savedHistory));
    }
  }, []);

  const registerFace = async () => {
    if (!walletAddress) {
      alert('Please connect your MetaMask wallet first.');
      return;
    }

    const detections = await faceapi
      .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detections) {
      alert('No face detected. Please try again.');
      return;
    }

    const existingUser = registeredUsers.find((user) => {
      const distance = faceapi.euclideanDistance(user.descriptor, detections.descriptor);
      return distance < 0.6;
    });

    if (existingUser) {
      alert(`❌ This face is already registered with wallet: ${existingUser.walletAddress}`);
      return;
    }

    const newUser = {
      walletAddress: walletAddress,
      descriptor: Array.from(detections.descriptor),
    };

    const updatedUsers = [...registeredUsers, newUser];
    setRegisteredUsers(updatedUsers);
    persistUsers(updatedUsers);

    alert(`✅ Face registered for wallet: ${walletAddress}`);
  };

  const recognizeAndPay = async () => {
    const detection = await faceapi
      .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      alert('No face detected. Please try again.');
      return;
    }

    const labeledDescriptors = registeredUsers.map(user =>
      new faceapi.LabeledFaceDescriptors(
        user.walletAddress,
        [new Float32Array(user.descriptor)]
      )
    );

    const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6);
    const match = faceMatcher.findBestMatch(detection.descriptor);

    if (match.label !== 'unknown') {
      const matchedUser = registeredUsers.find(user => user.walletAddress === match.label);
      const distance = faceapi.euclideanDistance(matchedUser.descriptor, detection.descriptor);

      if (distance < 0.45) {
        alert(`✅ Face recognized! Wallet: ${match.label}`);

        const amount = prompt('Enter the amount to pay:');
        if (amount && !isNaN(amount) && parseFloat(amount) > 0) {
          setPaymentAmount(amount);
          setPaymentInProgress(true);

          const newHistory = [
            ...paymentHistory,
            { walletAddress: match.label, amount, timestamp: new Date().toLocaleString() },
          ];

          setPaymentHistory(newHistory);
          persistHistory(newHistory);

          alert(`✅ Payment of ${amount} ETH triggered for wallet: ${match.label}`);
        } else {
          alert('❌ Invalid amount entered.');
        }
      } else {
        alert('❌ Face not recognized.');
      }
    } else {
      alert('❌ Face not recognized.');
    }
  };

  const clearRegisteredFaces = () => {
    setRegisteredUsers([]);
    localStorage.removeItem('face-users');
    alert('✅ All registered faces have been cleared.');
  };

  useEffect(() => {
    loadModels().then(startVideo);

    videoRef.current && videoRef.current.addEventListener('play', () => {
      const canvas = faceapi.createCanvasFromMedia(videoRef.current);
      canvasRef.current.innerHTML = '';
      canvasRef.current.append(canvas);

      const displaySize = {
        width: videoRef.current.width,
        height: videoRef.current.height,
      };
      faceapi.matchDimensions(canvas, displaySize);

      setInterval(async () => {
        const detections = await faceapi
          .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptors();

        const resized = faceapi.resizeResults(detections, displaySize);
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
        faceapi.draw.drawDetections(canvas, resized);
        faceapi.draw.drawFaceLandmarks(canvas, resized);
      }, 100);
    });
  }, []);

  return (
    <div style={{ position: 'relative', overflow: 'hidden', minHeight: '100vh', padding: '20px', fontFamily: 'Arial', color: '#f0f0f0' }}>
      {/* Animated Gradient Background */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'linear-gradient(-45deg, #0f2027, #203a43, #2c5364, #00ffcc)',
        backgroundSize: '400% 400%',
        animation: 'gradientBG 20s ease infinite',
        zIndex: -2
      }} />

      {/* Floating Crypto Images */}
      <img src="https://cryptologos.cc/logos/ethereum-eth-logo.png" alt="ETH" style={floatingStyle(0)} />
      <img src="https://cryptologos.cc/logos/bitcoin-btc-logo.png" alt="BTC" style={floatingStyle(1)} />
      <img src="https://cryptologos.cc/logos/tether-usdt-logo.png" alt="USDT" style={floatingStyle(2)} />

      <style>{`
        @keyframes gradientBG {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes float {
          0% { transform: translateY(0); opacity: 0.8; }
          50% { transform: translateY(-20px); opacity: 1; }
          100% { transform: translateY(0); opacity: 0.8; }
        }
        button {
          transition: all 0.3s ease;
          cursor: pointer;
        }
        button:hover {
          transform: scale(1.05);
          opacity: 0.85;
        }
      `}</style>

      <h2 style={{ color: '#00ffcc', marginBottom: '30px' }}>👤 Face + Crypto Wallet App</h2>

      <button onClick={connectWallet} style={buttonStyle}>
        {walletAddress ? `Connected: ${walletAddress.slice(0, 6)}...` : 'Connect Wallet'}
      </button>

      <div style={{ marginTop: '20px' }}>
        <button onClick={registerFace} style={buttonStyle}>Register Face</button>
        <button onClick={recognizeAndPay} style={buttonStyle}>Recognize & Pay</button>
        <button onClick={clearRegisteredFaces} style={{ ...buttonStyle, backgroundColor: '#ff4c4c' }}>Clear All Faces</button>
      </div>

      <div style={{ marginTop: '30px' }}>
        <video ref={videoRef} width="720" height="560" autoPlay muted style={{ border: '2px solid #00ffcc', borderRadius: '10px' }} />
        <div ref={canvasRef} />
      </div>

      {paymentInProgress && (
        <div style={{ marginTop: '20px', color: '#00ffcc' }}>
          <h3>💰 Payment in Progress</h3>
          <p>Amount: {paymentAmount} ETH</p>
        </div>
      )}

      {registeredUsers.length > 0 && (
        <div style={{ marginTop: '30px' }}>
          <h3>👥 Registered Users</h3>
          <ul>
            {registeredUsers.map((user, index) => (
              <li key={index}>{user.walletAddress}</li>
            ))}
          </ul>
        </div>
      )}

      {paymentHistory.length > 0 && (
        <div style={{ marginTop: '30px' }}>
          <h3>📜 Payment History</h3>
          <table style={{ margin: '0 auto', width: '90%', borderCollapse: 'collapse', backgroundColor: '#1e1e1e' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #00ffcc' }}>
                <th style={tableHeader}>Wallet</th>
                <th style={tableHeader}>Amount (ETH)</th>
                <th style={tableHeader}>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {paymentHistory.map((payment, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #333' }}>
                  <td style={tableCell}>{payment.walletAddress}</td>
                  <td style={tableCell}>{payment.amount}</td>
                  <td style={tableCell}>{payment.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// Reusable styles
const buttonStyle = {
  margin: '10px',
  padding: '10px 20px',
  backgroundColor: '#333',
  color: '#fff',
  border: '1px solid #555',
  borderRadius: '5px'
};

const tableHeader = {
  padding: '10px',
  color: '#00ffcc'
};

const tableCell = {
  padding: '10px',
  color: '#f0f0f0'
};

// Floating image style generator
const floatingStyle = (index) => ({
  position: 'absolute',
  top: `${20 + index * 10}%`,
  left: `${10 + index * 30}%`,
  width: '50px',
  animation: `float ${4 + index}s ease-in-out infinite`,
  zIndex: -1,
  opacity: 0.7
});

export default FaceRecognition;
