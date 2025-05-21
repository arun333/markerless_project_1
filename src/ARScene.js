// src/ARScene.js
import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js';

const ARScene = () => {
  const containerRef = useRef();

  useEffect(() => {
    let scene, camera, renderer;
    let reticle, dynamicPlane, waterTexture;
    let hitTestSource = null;
    let hitTestSourceRequested = false;

    // Scene setup
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera();

    // Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    containerRef.current.appendChild(renderer.domElement);

    // Add AR button
    document.body.appendChild(
      ARButton.createButton(renderer, { requiredFeatures: ['hit-test'] })
    );

    // Add light
    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    scene.add(light);

    // Create reticle
    reticle = new THREE.Mesh(
      new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    );
    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
    scene.add(reticle);

    // Load water texture
    waterTexture = new THREE.TextureLoader().load('/water.jpg', () => {
      waterTexture.wrapS = waterTexture.wrapT = THREE.RepeatWrapping;
      waterTexture.repeat.set(4, 4);
    });

    // Create dynamic plane with water texture
    const waterMaterial = new THREE.MeshBasicMaterial({
      map: waterTexture,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });

    dynamicPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(0.6, 0.6),
      waterMaterial
    );
    dynamicPlane.rotation.x = -Math.PI / 2;
    dynamicPlane.visible = false;
    scene.add(dynamicPlane);

    // Animation/render loop
    renderer.setAnimationLoop((timestamp, frame) => {
      // Animate water scroll
      if (waterTexture) {
        waterTexture.offset.y -= 0.003;
      }

      // WebXR hit test
      if (frame) {
        const referenceSpace = renderer.xr.getReferenceSpace();
        const session = renderer.xr.getSession();

        if (!hitTestSourceRequested) {
          session.requestReferenceSpace('viewer').then((refSpace) => {
            session.requestHitTestSource({ space: refSpace }).then((source) => {
              hitTestSource = source;
            });
          });

          session.addEventListener('end', () => {
            hitTestSourceRequested = false;
            hitTestSource = null;
          });

          hitTestSourceRequested = true;
        }

        if (hitTestSource) {
          const hitTestResults = frame.getHitTestResults(hitTestSource);

          if (hitTestResults.length > 0) {
            const hit = hitTestResults[0];
            const pose = hit.getPose(referenceSpace);

            reticle.visible = true;
            reticle.matrix.fromArray(pose.transform.matrix);

            dynamicPlane.visible = true;
            dynamicPlane.position.setFromMatrixPosition(reticle.matrix);
          } else {
            reticle.visible = false;
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
