// src/ARScene.js
import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js';

const ARScene = () => {
  const containerRef = useRef();

  useEffect(() => {
    let scene, camera, renderer;
    let dynamicPlane = null;
    let waterTexture = null;
    let hitTestSource = null;
    let hitTestSourceRequested = false;

    // Optional on-screen debug logger
    const log = (msg) => {
      console.log(msg);
      const el = document.getElementById('debug-log');
      if (el) el.innerText = msg;
    };

    // Setup scene and renderer
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera();

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    containerRef.current.appendChild(renderer.domElement);

    document.body.appendChild(
      ARButton.createButton(renderer, { requiredFeatures: ['hit-test'] })
    );

    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    scene.add(light);

    // Load water texture and create plane
    waterTexture = new THREE.TextureLoader().load('/water.jpg', () => {
      log("✅ Water texture loaded.");

      waterTexture.wrapS = waterTexture.wrapT = THREE.RepeatWrapping;
      waterTexture.repeat.set(4, 4);

      const waterMaterial = new THREE.MeshBasicMaterial({
        map: waterTexture,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
      });

      dynamicPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(0.6, 0.6),
        waterMaterial
      );
      dynamicPlane.rotation.x = -Math.PI / 2;

      // 🔧 FORCED placement for testing (in front of camera)
      dynamicPlane.visible = true;
      dynamicPlane.position.set(0, 0, -0.5); // 0.5m in front of camera

      scene.add(dynamicPlane);
      log("✅ Water plane created and forced visible.");
    });

    // Main render loop
    renderer.setAnimationLoop((timestamp, frame) => {
      if (waterTexture) {
        waterTexture.offset.y -= 0.003; // animate flow
      }

      if (frame) {
        const referenceSpace = renderer.xr.getReferenceSpace();
        const session = renderer.xr.getSession();

        if (!hitTestSourceRequested) {
          session.requestReferenceSpace('viewer').then((refSpace) => {
            session.requestHitTestSource({ space: refSpace }).then((source) => {
              hitTestSource = source;
              log("✅ Hit test source acquired.");
            });
          });

          session.addEventListener('end', () => {
            hitTestSourceRequested = false;
            hitTestSource = null;
            log("ℹ️ AR session ended.");
          });

          hitTestSourceRequested = true;
        }

        if (hitTestSource) {
          const hitTestResults = frame.getHitTestResults(hitTestSource);

          if (hitTestResults.length > 0) {
            const hit = hitTestResults[0];
            const pose = hit.getPose(referenceSpace);

            if (dynamicPlane) {
              dynamicPlane.visible = true;
              dynamicPlane.position.setFromMatrixPosition(
                new THREE.Matrix4().fromArray(pose.transform.matrix)
              );
              log("✅ Surface detected. Water plane positioned.");
            }
          }
        }
      }

      renderer.render(scene, camera);
    });

    return () => {
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <>
      <div ref={containerRef} />
      <div
        id="debug-log"
        style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          color: 'white',
          background: 'rgba(0,0,0,0.7)',
          padding: '5px 10px',
          fontSize: '14px',
          zIndex: 9999,
          borderRadius: '6px',
        }}
      >
        Loading...
      </div>
    </>
  );
};

export default ARScene;
