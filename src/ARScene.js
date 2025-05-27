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

    // Log helper (shows in Eruda)
    const log = (msg) => {
      console.log(msg);
      const logBox = document.getElementById('debug-log');
      if (logBox) logBox.innerText = msg;
    };

    // Scene setup
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera();

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    containerRef.current.appendChild(renderer.domElement);

    // Add AR button
    document.body.appendChild(
      ARButton.createButton(renderer, { requiredFeatures: ['hit-test'] })
    );

    // Light
    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    scene.add(light);

    // Load water texture
    waterTexture = new THREE.TextureLoader().load('/water.jpg', () => {
      log("✅ Water texture loaded.");

      waterTexture.wrapS = THREE.RepeatWrapping;
      waterTexture.wrapT = THREE.RepeatWrapping;
      waterTexture.repeat.set(4, 4);

      const waterMaterial = new THREE.MeshBasicMaterial({
        map: waterTexture,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
      });

      dynamicPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(0.6, 0.6),
        waterMaterial
      );
      dynamicPlane.rotation.x = -Math.PI / 2;
      dynamicPlane.visible = false;
      scene.add(dynamicPlane);

      log("✅ Water plane added to scene.");
    });

    // Animation loop
    renderer.setAnimationLoop((timestamp, frame) => {
      if (waterTexture) {
        waterTexture.offset.y -= 0.003;
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
            const position = new THREE.Matrix4().fromArray(pose.transform.matrix);

            if (dynamicPlane) {
              dynamicPlane.visible = true;
              dynamicPlane.position.setFromMatrixPosition(position);
              log("✅ Surface detected. Water plane placed.");
            }
          } else {
            if (dynamicPlane) dynamicPlane.visible = false;
          }
        }
      }

      renderer.render(scene, camera);
    });

    // Cleanup
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
          borderRadius: '8px',
        }}
      >
        Initializing...
      </div>
    </>
  );
};

export default ARScene;
