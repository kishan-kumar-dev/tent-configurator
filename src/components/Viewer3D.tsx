import { Suspense, useMemo } from "react";
import * as THREE from "three";

import { Canvas } from "@react-three/fiber";
import { Center, Environment, OrbitControls, useGLTF } from "@react-three/drei";

import type { ArtworkDesign, PanelColors } from "../types/configurator";

type Viewer3DProps = {
  modelPath: string;
  panelColors: PanelColors;
  artwork: ArtworkDesign;
};

// Three.js geometry group information.
type GeometryGroupInfo = {
  start: number;
  count: number;
  materialIndex?: number;
};

// Check whether a material belongs to the tent fabric.
function isFabricMaterial(material: THREE.Material): boolean {
  return material.name.toLowerCase().includes("fabric");
}

// Check whether a mesh belongs to the fabric.
function isFabricMesh(mesh: THREE.Mesh): boolean {
  const meshName = mesh.name.toLowerCase();

  const materials = Array.isArray(mesh.material)
    ? mesh.material
    : [mesh.material];

  return (
    meshName.includes("fabric") ||
    materials.some((material) => isFabricMaterial(material))
  );
}

// Calculate the bounding box using fabric meshes only.
function getFabricBounds(scene: THREE.Object3D): THREE.Box3 {
  const bounds = new THREE.Box3();
  let foundFabric = false;

  scene.updateMatrixWorld(true);

  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    if (!isFabricMesh(object)) return;

    const meshBounds = new THREE.Box3().setFromObject(object);

    if (!foundFabric) {
      bounds.copy(meshBounds);
      foundFabric = true;
    } else {
      bounds.union(meshBounds);
    }
  });

  if (!foundFabric) {
    bounds.setFromObject(scene);
  }

  return bounds;
}

// Identify which tent panel a triangle belongs to.
function getPanelColor(
  center: THREE.Vector3,
  normal: THREE.Vector3,
  bounds: THREE.Box3,
  colors: PanelColors,
): string {
  const size = new THREE.Vector3();
  bounds.getSize(size);

  const roofThreshold = bounds.min.y + size.y * 0.68;

  // Roof.
  if (center.y >= roofThreshold && Math.abs(normal.y) > 0.3) {
    return colors.roof;
  }

  // Identify the main direction of the surface.
  if (Math.abs(normal.z) >= Math.abs(normal.x)) {
    return normal.z >= 0 ? colors.front : colors.back;
  }

  return normal.x >= 0 ? colors.right : colors.left;
}

// Create cloned materials without changing the original GLB materials.
function cloneMaterials(
  materials: THREE.Material[],
  meshIsFabric: boolean,
): THREE.Material[] {
  return materials.map((material) => {
    const clonedMaterial = material.clone();

    if (meshIsFabric || isFabricMaterial(material)) {
      const fabricMaterial = clonedMaterial as THREE.MeshStandardMaterial;

      fabricMaterial.map = null;
      fabricMaterial.emissiveMap = null;
      fabricMaterial.color.set("#ffffff");
      fabricMaterial.vertexColors = true;
    }

    return clonedMaterial;
  });
}

// Create a colored copy of the tent scene.
function createColoredScene(
  originalScene: THREE.Object3D,
  panelColors: PanelColors,
): THREE.Group {
  const clonedScene = originalScene.clone(true);

  clonedScene.updateMatrixWorld(true);

  const fabricBounds = getFabricBounds(clonedScene);

  clonedScene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;

    const mesh = object;
    const meshIsFabric = isFabricMesh(mesh);

    if (!meshIsFabric) return;

    // Clone geometry so the original GLB remains unchanged.
    const geometry = mesh.geometry.clone();

    // Convert indexed geometry into individual triangles.
    const nonIndexedGeometry = geometry.index
      ? geometry.toNonIndexed()
      : geometry;

    if (geometry !== nonIndexedGeometry) {
      geometry.dispose();
    }

    mesh.geometry = nonIndexedGeometry;

    const positionAttribute = nonIndexedGeometry.getAttribute("position");

    const colors = new Float32Array(positionAttribute.count * 3);

    const groups = nonIndexedGeometry.groups as GeometryGroupInfo[];

    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material];

    const worldA = new THREE.Vector3();
    const worldB = new THREE.Vector3();
    const worldC = new THREE.Vector3();

    const center = new THREE.Vector3();
    const edgeA = new THREE.Vector3();
    const edgeB = new THREE.Vector3();
    const normal = new THREE.Vector3();

    const vertexColor = new THREE.Color();

    // Process every triangle.
    for (
      let vertexIndex = 0;
      vertexIndex < positionAttribute.count;
      vertexIndex += 3
    ) {
      const group = groups.find(
        (item: GeometryGroupInfo) =>
          vertexIndex >= item.start && vertexIndex < item.start + item.count,
      );

      const materialIndex = group?.materialIndex ?? 0;
      const triangleMaterial = materials[materialIndex];

      const triangleIsFabric =
        meshIsFabric ||
        (triangleMaterial ? isFabricMaterial(triangleMaterial) : false);

      // Get triangle world coordinates.
      worldA.fromBufferAttribute(positionAttribute, vertexIndex);
      worldB.fromBufferAttribute(positionAttribute, vertexIndex + 1);
      worldC.fromBufferAttribute(positionAttribute, vertexIndex + 2);

      worldA.applyMatrix4(mesh.matrixWorld);
      worldB.applyMatrix4(mesh.matrixWorld);
      worldC.applyMatrix4(mesh.matrixWorld);

      // Calculate triangle center.
      center
        .copy(worldA)
        .add(worldB)
        .add(worldC)
        .multiplyScalar(1 / 3);

      // Calculate triangle normal in world space.
      edgeA.subVectors(worldB, worldA);
      edgeB.subVectors(worldC, worldA);

      normal.crossVectors(edgeA, edgeB).normalize();

      // Determine the correct panel color.
      const panelColor = triangleIsFabric
        ? getPanelColor(center, normal, fabricBounds, panelColors)
        : "#ffffff";

      vertexColor.set(panelColor);

      // Apply the same color to all three triangle vertices.
      for (let offset = 0; offset < 3; offset++) {
        const index = (vertexIndex + offset) * 3;

        colors[index] = vertexColor.r;
        colors[index + 1] = vertexColor.g;
        colors[index + 2] = vertexColor.b;
      }
    }

    nonIndexedGeometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(colors, 3),
    );

    // Clone materials to avoid modifying the cached GLB.
    const clonedMaterials = cloneMaterials(materials, meshIsFabric);

    mesh.material = Array.isArray(mesh.material)
      ? clonedMaterials
      : clonedMaterials[0];
  });

  return clonedScene as THREE.Group;
}

// Generate the logo and text artwork texture.
function createArtworkTexture(design: ArtworkDesign): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");

  canvas.width = 600;
  canvas.height = 360;

  const context = canvas.getContext("2d");

  if (!context) {
    return new THREE.CanvasTexture(canvas);
  }

  context.clearRect(0, 0, canvas.width, canvas.height);

  // Draw uploaded logo.
  if (design.logo) {
    const image = new Image();

    image.onload = () => {
      const maxWidth = 190;
      const maxHeight = 125;

      const scale = Math.min(
        maxWidth / image.width,
        maxHeight / image.height,
        1,
      );

      const width = image.width * scale;
      const height = image.height * scale;

      const x = (design.logoX / 100) * canvas.width;
      const y = (design.logoY / 100) * canvas.height;

      context.drawImage(image, x - width / 2, y - height / 2, width, height);

      texture.needsUpdate = true;
    };

    image.src = design.logo;
  }

  // Draw custom text.
  if (design.text.trim()) {
    context.font = "bold 30px Arial";
    context.fillStyle = design.textColor;
    context.textAlign = "center";
    context.textBaseline = "middle";

    context.fillText(
      design.text,
      (design.textX / 100) * canvas.width,
      (design.textY / 100) * canvas.height,
      550,
    );
  }

  const texture = new THREE.CanvasTexture(canvas);

  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  return texture;
}

// 3D tent model.
function TentModel({
  modelPath,
  panelColors,
}: {
  modelPath: string;
  panelColors: PanelColors;
}) {
  const { scene } = useGLTF(modelPath);

  const coloredScene = useMemo(
    () => createColoredScene(scene, panelColors),
    [scene, panelColors],
  );

  return <primitive object={coloredScene} />;
}

// 3D artwork overlay.
function ArtworkOverlay({ artwork }: { artwork: ArtworkDesign }) {
  const texture = useMemo(() => createArtworkTexture(artwork), [artwork]);

  return (
    <mesh position={[0, 1.05, 0.765]} renderOrder={10}>
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

// Main viewer component.
export default function Viewer3D({
  modelPath,
  panelColors,
  artwork,
}: Viewer3DProps) {
  return (
    <div
      className="viewer-3d"
      style={{
        width: "100%",
        height: "100%",
        minHeight: "420px",
      }}
    >
      <Canvas
        camera={{
          position: [3.4, 2.5, 4.2],
          fov: 38,
        }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: true,
        }}
      >
        <color attach="background" args={["#f5f6f8"]} />

        <ambientLight intensity={1.1} />

        <directionalLight position={[5, 8, 5]} intensity={2} />

        <directionalLight position={[-5, 4, -5]} intensity={0.8} />

        <Suspense fallback={null}>
          <Center>
            <TentModel modelPath={modelPath} panelColors={panelColors} />

            <ArtworkOverlay artwork={artwork} />
          </Center>

          <Environment preset="city" />
        </Suspense>

        <OrbitControls
          makeDefault
          enablePan
          enableZoom
          enableRotate
          minDistance={2}
          maxDistance={10}
          minPolarAngle={0.2}
          maxPolarAngle={Math.PI / 2}
          dampingFactor={0.08}
          enableDamping
        />
      </Canvas>
    </div>
  );
}
