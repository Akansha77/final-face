import React, { useRef, useEffect, useState } from 'react';
import * as faceapi from 'face-api.js';

const FaceRecognition = () => {
  const videoRef = useRef();
  const canvasRef = useRef();
  const [walletAddress, setWalletAddress] = useState('');
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentInProgress, setPaymentInProgress] = useState(false);
  const [matchedSocials, setMatchedSocials] = useState(null); // 🌟 NEW

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

  useEffect(() => {
    const saved = localStorage.getItem('face-users');
    if (saved) {
      const parsed = JSON.parse(saved);
      const converted = parsed.map(user => ({
        walletAddress: user.walletAddress,
        descriptor: new Float32Array(user.descriptor),
        linkedin: user.linkedin || '', // 🌟 NEW
        instagram: user.instagram || '', // 🌟 NEW
      }));
      setRegisteredUsers(converted);
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

    // 🌟 NEW - Prompt for social links
    const linkedin = prompt('Enter your LinkedIn URL (optional):') || '';
    const instagram = prompt('Enter your Instagram URL (optional):') || '';

    const newUser = {
      walletAddress: walletAddress,
      descriptor: Array.from(detections.descriptor),
      linkedin,
      instagram,
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
        setMatchedSocials({ linkedin: matchedUser.linkedin, instagram: matchedUser.instagram }); // 🌟 NEW

        const amount = prompt('Enter the amount to pay:');
        if (amount && !isNaN(amount) && parseFloat(amount) > 0) {
          setPaymentAmount(amount);
          setPaymentInProgress(true);
          alert(`✅ Payment of ${amount} triggered for wallet: ${match.label}`);
        } else {
          alert('❌ Invalid amount entered.');
        }
      } else {
        alert('❌ Face matched, but confidence is too low. Payment aborted.');
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
    <div style={{ textAlign: 'center' }}>
      <h2>👤 Register Your Face with Crypto Wallet</h2>
      <button onClick={connectWallet} style={{ padding: '10px 20px' }}>
        {walletAddress ? `Connected: ${walletAddress.slice(0, 6)}...` : 'Connect Wallet'}
      </button>
      <br />
      <button onClick={registerFace} style={{ marginTop: '10px', padding: '10px 20px' }}>
        Register Face
      </button>
      <button onClick={recognizeAndPay} style={{ marginTop: '10px', padding: '10px 20px', marginLeft: '10px' }}>
        Recognize & Pay
      </button>
      <button onClick={clearRegisteredFaces} style={{ marginTop: '10px', padding: '10px 20px', marginLeft: '10px' }}>
        Clear All Registered Faces
      </button>

      <div style={{ marginTop: '20px' }}>
        <video ref={videoRef} width="720" height="560" autoPlay muted />
        <div ref={canvasRef} />
      </div>

      {paymentInProgress && (
        <div style={{ marginTop: '20px' }}>
          <h3>💰 Payment in Progress</h3>
          <p>Amount: {paymentAmount} ETH</p>
        </div>
      )}

      {matchedSocials && ( // 🌟 NEW
        <div style={{ marginTop: '20px' }}>
          <h3>🔗 Social Links</h3>
          {matchedSocials.linkedin && <p><a href={matchedSocials.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a></p>}
          {matchedSocials.instagram && <p><a href={matchedSocials.instagram} target="_blank" rel="noopener noreferrer">Instagram</a></p>}
        </div>
      )}

      {registeredUsers.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h3>👥 Registered Users (Wallets):</h3>
          <ul>
            {registeredUsers.map((user, index) => (
              <li key={index}>{user.walletAddress}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default FaceRecognition;
