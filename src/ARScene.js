// src/ARScene.js
import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { ARButton } from 'three/examples/jsm/webxr/ARButton';

const ARScene = () => {
  const containerRef = useRef();

  useEffect(() => {
    let scene, camera, renderer;
    let floorImagePlane = null;
    let hitTestSource = null;
    let hitTestSourceRequested = false;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera();

    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    containerRef.current.appendChild(renderer.domElement);

    document.body.appendChild(
      ARButton.createButton(renderer, { requiredFeatures: ['hit-test'] })
    );

    // Light
    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    scene.add(light);

    // Load the image as a texture and create the plane
    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load('/water.jpg', () => {
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.DoubleSide,
        transparent: true,
      });

      const geometry = new THREE.PlaneGeometry(0.6, 0.6);
      floorImagePlane = new THREE.Mesh(geometry, material);
      floorImagePlane.rotation.x = -Math.PI / 2;
      floorImagePlane.visible = false;

      scene.add(floorImagePlane);
      console.log("✅ Floor image plane ready.");
    });

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
            const matrix = new THREE.Matrix4().fromArray(pose.transform.matrix);

            if (floorImagePlane) {
              floorImagePlane.visible = true;
              floorImagePlane.position.setFromMatrixPosition(matrix);
              console.log("✅ Floor detected. Image placed.");
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
