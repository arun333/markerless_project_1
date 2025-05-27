// src/ARScene.js
import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js';

const ARScene = () => {
  const containerRef = useRef();

  useEffect(() => {
    let scene, camera, renderer;
    let dynamicPlane, waterTexture;
    let hitTestSource = null;
    let hitTestSourceRequested = false;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera();

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    containerRef.current.appendChild(renderer.domElement);

    // AR button
    document.body.appendChild(
      ARButton.createButton(renderer, { requiredFeatures: ['hit-test'] })
    );

    // Lighting
    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    scene.add(light);

    // Load water texture
    waterTexture = new THREE.TextureLoader().load('/water.jpg', () => {
      waterTexture.wrapS = THREE.RepeatWrapping;
      waterTexture.wrapT = THREE.RepeatWrapping;
      waterTexture.repeat.set(4, 4);

      const waterMaterial = new THREE.MeshBasicMaterial({
        map: waterTexture,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
      });

      dynamicPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(0.6, 0.6),
        waterMaterial
      );
      dynamicPlane.rotation.x = -Math.PI / 2;
      dynamicPlane.visible = false;
      scene.add(dynamicPlane);
    });

    // Animation loop
    renderer.setAnimationLoop((timestamp, frame) => {
      if (waterTexture) {
        waterTexture.offset.y -= 0.003; // animate scroll
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

            if (dynamicPlane) {
              dynamicPlane.visible = true;
              dynamicPlane.position.setFromMatrixPosition(
                new THREE.Matrix4().fromArray(pose.transform.matrix)
              );
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

  return <div ref={containerRef} />;
};

export default ARScene;
