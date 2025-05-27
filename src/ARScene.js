// src/ARScene.js
import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js';

const ARScene = () => {
  const containerRef = useRef();

  useEffect(() => {
    let camera, scene, renderer, reticle, dynamicPlane, waterTexture;
    let hitTestSource = null;
    let hitTestSourceRequested = false;

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

    // Reticle
    reticle = new THREE.Mesh(
      new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x0f0 })
    );
    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
    scene.add(reticle);

    // Load water texture
    waterTexture = new THREE.TextureLoader().load('/water.jpg', () => {
      waterTexture.wrapS = THREE.RepeatWrapping;
      waterTexture.wrapT = THREE.RepeatWrapping;
      waterTexture.repeat.set(4, 4);
    });

    // Create plane with water texture
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

    // Animation loop
    renderer.setAnimationLoop((timestamp, frame) => {
      // Animate water texture scroll
      if (waterTexture) {
        waterTexture.offset.y -= 0.003; // Controls flow speed
      }

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
