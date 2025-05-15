import React, { useEffect } from "react";

function App() {
  useEffect(() => {
    if (navigator.xr) {
      navigator.xr.isSessionSupported("immersive-ar").then((supported) => {
        console.log("WebXR AR supported:", supported);
        if (!supported) {
          alert("WebXR AR not supported on this device.");
        }
      });
    } else {
      alert("WebXR not available in this browser.");
    }
  }, []);

  return (
    <a-scene
      embedded
      vr-mode-ui="enabled: true"
      renderer="logarithmicDepthBuffer: true;"
      style={{ width: "100%", height: "100%", position: "fixed", top: 0, left: 0 }}
    >
      <a-box position="0 0 -2" color="blue" scale="0.5 0.5 0.5"></a-box>
      <a-light type="ambient" intensity="1"></a-light>
      <a-entity camera look-controls></a-entity>
    </a-scene>
  );
}

export default App;
