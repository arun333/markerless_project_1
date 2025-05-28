import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const ARScene = () => {
  const containerRef = useRef();

  useEffect(() => {
    let scene, camera, renderer;
    let dynamicPlane, model, controller;
    let modelLoaded = false;
    let hitTestSource = null;
    let hitTestSourceRequested = false;
    let lastHitPose = null;

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

    // Solid-colored plane
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

    // Load 3D model
    const loader = new GLTFLoader();
    loader.load(
      '/models/scene.gltf',
      (gltf) => {
        model = gltf.scene;
        model.visible = false;
        model.scale.set(0.3, 0.3, 0.3);
        scene.add(model);
        modelLoaded = true;
        console.log("✅ Model loaded.");
      },
      undefined,
      (err) => {
        console.error("❌ Failed to load model:", err);
      }
    );

    // Tap interaction controller
    controller = renderer.xr.getController(0);
    scene.add(controller);

    controller.addEventListener('select', () => {
      if (lastHitPose && modelLoaded) {
        const mat = new THREE.Matrix4().fromArray(lastHitPose.transform.matrix);
        const pos = new THREE.Vector3().setFromMatrixPosition(mat);

        // Show and place the plane
        dynamicPlane.visible = true;
        dynamicPlane.position.copy(pos);

        // Show and place the model
        model.visible = true;
        model.position.copy(pos);
        model.position.y += 0.01;
      }
    });

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
              lastHitPose = pose;
              // Optional: show a debug log or visual reticle here
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

  return <div ref={containerRef} />;
};

export default ARScene;
