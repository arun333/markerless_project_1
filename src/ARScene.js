// src/ARScene.js
import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js';

const ARScene = () => {
  const containerRef = useRef();

  useEffect(() => {
    let camera, scene, renderer, controller;
    let reticle;
    let hitTestSource = null;
    let hitTestSourceRequested = false;
    let waterAdded = false; // ✅ Track if water already placed

    const animatedWaterTextures = [];

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

    // Reticle
    reticle = new THREE.Mesh(
      new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x0f0 })
    );
    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
    reticle.userData.ignoreRaycast = true;
    scene.add(reticle);

    // Controller (still needed for some devices)
    controller = renderer.xr.getController(0);
    scene.add(controller);

    // 🔁 Animation loop
    renderer.setAnimationLoop((timestamp, frame) => {
      // Animate water scroll
      animatedWaterTextures.forEach((tex) => {
        tex.offset.y -= 0.005;
      });

      if (frame) {
        const referenceSpace = renderer.xr.getReferenceSpace();
        const session = renderer.xr.getSession();

        if (!hitTestSourceRequested) {
          session.requestReferenceSpace('viewer').then((refSpace) => {
            session
              .requestHitTestSource({ space: refSpace })
              .then((source) => {
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

            // ✅ Add water only ONCE
            if (!waterAdded) {
              const waterTexture = new THREE.TextureLoader().load('/image.png');
              waterTexture.wrapS = THREE.RepeatWrapping;
              waterTexture.wrapT = THREE.RepeatWrapping;
              waterTexture.repeat.set(4, 4);

              const waterMaterial = new THREE.MeshBasicMaterial({
                map: waterTexture,
                transparent: true,
                opacity: 0.7,
              });

              const waterPlane = new THREE.Mesh(
                new THREE.PlaneGeometry(0.5, 0.5),
                waterMaterial
              );
              waterPlane.rotation.x = -Math.PI / 2;
              waterPlane.position.setFromMatrixPosition(reticle.matrix);
              waterPlane.userData.ignoreRaycast = true;
              scene.add(waterPlane);
              animatedWaterTextures.push(waterTexture);

              waterAdded = true;
            }
          } else {
            reticle.visible = false;
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
