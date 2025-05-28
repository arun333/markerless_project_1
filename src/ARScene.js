// src/ARScene.js
import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const ARScene = () => {
  const containerRef = useRef();

  useEffect(() => {
    let scene, camera, renderer;
    let dynamicPlane, model;
    let modelLoaded = false;
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

    // Lighting
    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    scene.add(light);

    // Create a simple plane (no texture)
    const planeMaterial = new THREE.MeshStandardMaterial({
      color: 0x88ccff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5,
    });

    dynamicPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      planeMaterial
    );
    dynamicPlane.rotation.x = -Math.PI / 2;
    dynamicPlane.visible = false;
    scene.add(dynamicPlane);

    // Load 3D model (.gltf)
    const loader = new GLTFLoader();
    loader.load(
      '/models/scene.gltf',
      (gltf) => {
        model = gltf.scene;
        model.visible = false;
        model.scale.set(0.3, 0.3, 0.3); // Adjust if needed
        scene.add(model);
        modelLoaded = true;
        console.log("✅ Model loaded.");
      },
      undefined,
      (error) => {
        console.error("❌ Error loading model:", error);
      }
    );

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
              const pos = new THREE.Vector3().setFromMatrixPosition(mat);

              // Show plane
              dynamicPlane.visible = true;
              dynamicPlane.position.copy(pos);

              // Show model
              if (model && modelLoaded) {
                model.visible = true;
                model.position.copy(pos);
                model.position.y += 0.01; // slightly above the plane
              }
            }
          } else {
            dynamicPlane.visible = false;
            if (model) model.visible = false;
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
