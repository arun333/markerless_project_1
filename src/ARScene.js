// src/ARScene.js
import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js';

const ARScene = () => {
  const containerRef = useRef();

  useEffect(() => {
    let camera, scene, renderer, dynamicPlane;
    let hitTestSource = null;
    let hitTestSourceRequested = false;

    // Scene setup
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera();

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    containerRef.current.appendChild(renderer.domElement);

    // AR Button
    document.body.appendChild(
      ARButton.createButton(renderer, { requiredFeatures: ['hit-test'] })
    );

    // Light
    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    scene.add(light);

    // ✅ Load image texture and create plane
    const texture = new THREE.TextureLoader().load('/water.jpg'); // Put floor.png in /public

    const planeMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide,
      transparent: true,
    });

    dynamicPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1), // size in meters (adjust as needed)
      planeMaterial
    );
    dynamicPlane.rotation.x = -Math.PI / 2; // Flat on floor
    dynamicPlane.visible = false;
    scene.add(dynamicPlane);

    // Animation loop
    renderer.setAnimationLoop((timestamp, frame) => {
      if (frame) {
        const referenceSpace = renderer.xr.getReferenceSpace();
        const session = renderer.xr.getSession();

        if (!hitTestSourceRequested) {
          session.requestReferenceSpace('viewer').then((refSpace) => {
            session.requestHitTestSource({ space: refSpace }).then((source) => {
              hitTestSource = source;
              console.log("✅ Hit test source acquired.");
            });
          });

          session.addEventListener('end', () => {
            hitTestSourceRequested = false;
            hitTestSource = null;
            console.log("🛑 AR session ended.");
          });

          hitTestSourceRequested = true;
        }

        if (hitTestSource) {
          const hitTestResults = frame.getHitTestResults(hitTestSource);

          if (hitTestResults.length > 0) {
            const hit = hitTestResults[0];
            const pose = hit.getPose(referenceSpace);

            if (pose) {
              const mat = new THREE.Matrix4().fromArray(pose.transform.matrix);
              dynamicPlane.visible = true;
              dynamicPlane.position.setFromMatrixPosition(mat);
            }
          } else {
            dynamicPlane.visible = false;
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

  return <div ref={containerRef} />;
};

export default ARScene;
