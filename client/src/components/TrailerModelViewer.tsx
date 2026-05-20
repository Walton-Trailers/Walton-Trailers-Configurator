import { Suspense, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment, ContactShadows, Html } from "@react-three/drei";
import { Loader2, RotateCcw, ZoomIn, ZoomOut, Move } from "lucide-react";
import * as THREE from "three";

// GLBs from different authoring tools place the mesh origin in different
// places — some at the geometric center, some at the bottom, some at a random
// point in the scene. To make every model sit consistently on the ground
// plane (y=0) we measure the loaded scene's axis-aligned bounding box and
// translate the whole thing up by -minY, so the lowest vertex lands at y=0.
//
// We wrap the scene in a <group> rather than mutating the loaded object's own
// position, because useGLTF() caches the scene at the URL level — mutating it
// would carry the offset into any other component that loads the same model.
function TrailerModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const offsetY = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    return Number.isFinite(box.min.y) ? -box.min.y : 0;
  }, [scene]);
  return (
    <group position={[0, offsetY, 0]}>
      <primitive object={scene} />
    </group>
  );
}

function LoadingSpinner() {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        <span className="text-sm text-gray-500">Loading 3D model...</span>
      </div>
    </Html>
  );
}

interface TrailerModelViewerProps {
  model3dUrl: string;
  fallbackImageUrl?: string;
  className?: string;
}

export function TrailerModelViewer({ model3dUrl, fallbackImageUrl, className = "" }: TrailerModelViewerProps) {
  const [hasError, setHasError] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const controlsRef = useRef<any>(null);

  if (hasError && fallbackImageUrl) {
    return (
      <img
        src={fallbackImageUrl}
        alt="Trailer"
        className={`w-full h-full object-contain drop-shadow-lg ${className}`}
      />
    );
  }

  if (hasError) {
    return (
      <div className={`w-full h-full flex items-center justify-center ${className}`}>
        <span className="text-gray-400 text-sm">Failed to load 3D model</span>
      </div>
    );
  }

  const handleReset = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  return (
    <div
      className={`relative w-full h-full ${className}`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
      onTouchStart={() => setShowControls(true)}
    >
      <Canvas
        camera={{ position: [5, 3, 5], fov: 45 }}
        style={{ background: "transparent" }}
        onError={() => setHasError(true)}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
        <directionalLight position={[-5, 5, -5]} intensity={0.3} />
        <Suspense fallback={<LoadingSpinner />}>
          <TrailerModel url={model3dUrl} />
          {/* Shadow plane sits at the new ground (y=0). Pull it up by 1mm
              so it doesn't z-fight the trailer's lowest mesh face. */}
          <ContactShadows
            position={[0, 0.001, 0]}
            opacity={0.45}
            scale={20}
            blur={2.4}
            far={4}
          />
          <Environment preset="city" />
        </Suspense>
        <OrbitControls
          ref={controlsRef}
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={2}
          maxDistance={20}
          minPolarAngle={0.1}
          maxPolarAngle={Math.PI / 2}
        />
      </Canvas>

      <div
        className={`absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-md transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Move className="w-3.5 h-3.5" />
          <span>Drag to rotate</span>
        </div>
        <div className="w-px h-4 bg-gray-300" />
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <ZoomIn className="w-3.5 h-3.5" />
          <span>Scroll to zoom</span>
        </div>
        <div className="w-px h-4 bg-gray-300" />
        <button
          onClick={handleReset}
          className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>
    </div>
  );
}
