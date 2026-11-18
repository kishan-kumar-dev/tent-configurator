
import { Suspense, useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { Center, OrbitControls, useGLTF } from "@react-three/drei";

import type {
  ArtworkDesign,
  PanelColors,
} from "../types/configurator";

type Viewer3DProps = {
  modelPath: string;
  panelColors: PanelColors;
  artwork: ArtworkDesign;
};

// ---------------------------------------------
// FABRIC DETECTION
// ---------------------------------------------

function isFabricMaterial(material: THREE.Material): boolean {
  const name = material.name.toLowerCase();

  return (
    name.includes("fabric") ||
    name.includes("cloth") ||
    name.includes("roof") ||
    name.includes("canopy") ||
    name.includes("tent")
  );
}

function isFabricMesh(mesh: THREE.Mesh): boolean {
  const name = mesh.name.toLowerCase();

  const materials = Array.isArray(mesh.material)
    ? mesh.material
    : [mesh.material];

  return (
    name.includes("fabric") ||
    name.includes("cloth") ||
    name.includes("roof") ||
    name.includes("canopy") ||
    name.includes("tent") ||
    materials.some(isFabricMaterial)
  );
}

// ---------------------------------------------
// SCENE BOUNDS
// ---------------------------------------------

function getSceneBounds(scene: THREE.Object3D): THREE.Box3 {
  scene.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(scene);
}

// ---------------------------------------------
// PANEL COLOR DETECTION
// ---------------------------------------------

function getTrianglePanelColor(
  normal: THREE.Vector3,
  center: THREE.Vector3,
  bounds: THREE.Box3,
  colors: PanelColors,
): string {
  const size = new THREE.Vector3();

  bounds.getSize(size);

  const roofThreshold = bounds.max.y - size.y * 0.38;

  // Roof.
  if (center.y >= roofThreshold && Math.abs(normal.y) > 0.35) {
    return colors.roof;
  }

  // Front and back.
  if (Math.abs(normal.z) >= Math.abs(normal.x)) {
    return normal.z >= 0 ? colors.front : colors.back;
  }

  // Left and right.
  return normal.x >= 0 ? colors.right : colors.left;
}

// ---------------------------------------------
// CREATE COLORED SCENE
// ---------------------------------------------

function createColoredScene(
  originalScene: THREE.Object3D,
  colors: PanelColors,
): THREE.Object3D {
  const scene = originalScene.clone(true);

  scene.updateMatrixWorld(true);

  const bounds = getSceneBounds(scene);

  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;

    if (!isFabricMesh(object)) return;

    const geometry = object.geometry.index
      ? object.geometry.toNonIndexed()
      : object.geometry.clone();

    const position = geometry.getAttribute("position");

    if (!position) {
      geometry.dispose();
      return;
    }

    const colorArray = new Float32Array(position.count * 3);

    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const c = new THREE.Vector3();

    const edge1 = new THREE.Vector3();
    const edge2 = new THREE.Vector3();

    const normal = new THREE.Vector3();
    const center = new THREE.Vector3();

    const worldCenter = new THREE.Vector3();
    const worldNormal = new THREE.Vector3();

    const parsedColor = new THREE.Color();

    for (let index = 0; index + 2 < position.count; index += 3) {
      a.fromBufferAttribute(position, index);
      b.fromBufferAttribute(position, index + 1);
      c.fromBufferAttribute(position, index + 2);

      edge1.subVectors(b, a);
      edge2.subVectors(c, a);

      normal.crossVectors(edge1, edge2).normalize();

      center
        .copy(a)
        .add(b)
        .add(c)
        .multiplyScalar(1 / 3);

      worldCenter.copy(center);

      object.localToWorld(worldCenter);

      worldNormal
        .copy(normal)
        .transformDirection(object.matrixWorld);

      const panelColor = getTrianglePanelColor(
        worldNormal,
        worldCenter,
        bounds,
        colors,
      );

      parsedColor.set(panelColor);

      for (let vertex = 0; vertex < 3; vertex++) {
        const offset = (index + vertex) * 3;

        colorArray[offset] = parsedColor.r;
        colorArray[offset + 1] = parsedColor.g;
        colorArray[offset + 2] = parsedColor.b;
      }
    }

    geometry.setAttribute(
      "color",
      new THREE.BufferAttribute(colorArray, 3),
    );

    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

    const originalMaterials = Array.isArray(object.material)
      ? object.material
      : [object.material];

    const clonedMaterials = originalMaterials.map((material) => {
      const cloned = material.clone();

      if (isFabricMaterial(material)) {
        if (
          cloned instanceof THREE.MeshStandardMaterial ||
          cloned instanceof THREE.MeshPhysicalMaterial
        ) {
          // Remove the original color texture.
          cloned.map = null;

          // Use a white base so selected colors display correctly.
          cloned.color.set("#FFFFFF");

          // Enable custom triangle colors.
          cloned.vertexColors = true;

          cloned.side = THREE.DoubleSide;
          cloned.roughness = 0.85;
          cloned.metalness = 0;
          cloned.transparent = false;
          cloned.opacity = 1;
          cloned.needsUpdate = true;
        } else if (
          cloned instanceof THREE.MeshPhongMaterial ||
          cloned instanceof THREE.MeshLambertMaterial
        ) {
          cloned.map = null;
          cloned.color.set("#FFFFFF");
          cloned.vertexColors = true;
          cloned.side = THREE.DoubleSide;
          cloned.transparent = false;
          cloned.opacity = 1;
          cloned.needsUpdate = true;
        }
      }

      return cloned;
    });

    object.geometry = geometry;

    object.material = Array.isArray(object.material)
      ? clonedMaterials
      : clonedMaterials[0];

    object.visible = true;
  });

  scene.updateMatrixWorld(true);

  return scene;
}

// ---------------------------------------------
// ARTWORK OVERLAY
// ---------------------------------------------

function ArtworkOverlay({
  artwork,
}: {
  artwork: ArtworkDesign;
}) {
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);

  useEffect(() => {
    const canvas = document.createElement("canvas");

    canvas.width = 600;
    canvas.height = 360;

    const context = canvas.getContext("2d");

    if (!context) return;

    let image: HTMLImageElement | null = null;

    const newTexture = new THREE.CanvasTexture(canvas);

    newTexture.colorSpace = THREE.SRGBColorSpace;

    const drawArtwork = () => {
      context.clearRect(0, 0, 600, 360);

      // Logo.
      if (image?.complete && image.naturalWidth > 0) {
        const maxWidth = 150;
        const maxHeight = 100;

        const scale = Math.min(
          maxWidth / image.naturalWidth,
          maxHeight / image.naturalHeight,
          1,
        );

        const width = image.naturalWidth * scale;
        const height = image.naturalHeight * scale;

        const x = (artwork.logoX / 100) * 600 - width / 2;
        const y = (artwork.logoY / 100) * 360 - height / 2;

        context.drawImage(image, x, y, width, height);
      }

      // Text.
      if (artwork.text.trim()) {
        context.save();

        context.fillStyle = artwork.textColor || "#222222";
        context.font = "bold 30px Arial";
        context.textAlign = "center";
        context.textBaseline = "middle";

        context.fillText(
          artwork.text.slice(0, 40),
          (artwork.textX / 100) * 600,
          (artwork.textY / 100) * 360,
          560,
        );

        context.restore();
      }

      newTexture.needsUpdate = true;
    };

    if (artwork.logo) {
      image = new Image();

      image.onload = drawArtwork;
      image.onerror = drawArtwork;

      image.src = artwork.logo;
    }

    drawArtwork();

    setTexture(newTexture);

    return () => {
      if (image) {
        image.onload = null;
        image.onerror = null;
      }

      newTexture.dispose();
    };
  }, [
    artwork.logo,
    artwork.text,
    artwork.textColor,
    artwork.logoX,
    artwork.logoY,
    artwork.textX,
    artwork.textY,
  ]);

  if (!texture) return null;

  return (
    <mesh position={[0, 1.05, 0.765]} renderOrder={2}>
      <planeGeometry args={[1.35, 0.81]} />

      <meshBasicMaterial
        map={texture}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

// ---------------------------------------------
// TENT MODEL
// ---------------------------------------------

function TentModel({
  modelPath,
  panelColors,
  artwork,
}: Viewer3DProps) {
  const { scene } = useGLTF(modelPath);

  const coloredScene = useMemo(
    () => createColoredScene(scene, panelColors),
    [scene, panelColors],
  );

  return (
    <>
      <primitive object={coloredScene} />

      <ArtworkOverlay artwork={artwork} />
    </>
  );
}

// ---------------------------------------------
// MAIN VIEWER
// ---------------------------------------------

function Viewer3D({
  modelPath,
  panelColors,
  artwork,
}: Viewer3DProps) {
  return (
    <Canvas
      camera={{
        position: [3.8, 3.0, 4.8],
        fov: 38,
      }}
      gl={{
        antialias: true,
        preserveDrawingBuffer: true,
      }}
      dpr={[1, 1.5]}
      shadows="percentage"
    >
      <color attach="background" args={["#F5F6F8"]} />

      <ambientLight intensity={1.5} />

      <directionalLight
        position={[5, 8, 5]}
        intensity={2.5}
        castShadow
      />

      <directionalLight
        position={[-5, 5, -5]}
        intensity={1}
      />

      <directionalLight
        position={[0, 5, 0]}
        intensity={0.7}
      />

      <Suspense fallback={null}>
        <Center>
          <TentModel
            modelPath={modelPath}
            panelColors={panelColors}
            artwork={artwork}
          />
        </Center>
      </Suspense>

      <OrbitControls
        makeDefault
        enablePan
        enableZoom
        enableRotate
        enableDamping
        minDistance={2}
        maxDistance={12}
        maxPolarAngle={Math.PI * 0.49}
        target={[0, 1, 0]}
      />
    </Canvas>
  );
}

export default Viewer3D;
