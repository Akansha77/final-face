import React from 'react';
import FaceRecognition from './components/FaceRecognition';

function App() {
  return (
    <div className="App" style={{ 
      fontFamily: 'Arial, sans-serif',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      
      {/* Animated Background */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'linear-gradient(-45deg, #0f2027, #203a43, #2c5364, #00ffcc)',
        backgroundSize: '400% 400%',
        animation: 'gradient 15s ease infinite',
        zIndex: -1
      }} />

      {/* Header */}
      <h2 style={{
        fontSize: '3rem',
        fontWeight: '700',
        color: '#00ffcc',
        textShadow: '2px 2px 5px rgba(0, 255, 204, 0.4)',
        letterSpacing: '2px',
        marginBottom: '30px',
        animation: 'fadeIn 1.5s ease-in-out'
      }}>
        FaceX:  Pay Anyone, Just with a Face
      </h2>

      {/* Face Recognition Component */}
      <FaceRecognition />

      {/* Animations */}
      <style>{`
        @keyframes gradient {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }

        @keyframes fadeIn {
          0% {
            opacity: 0;
            transform: translateY(-20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

export default App;
