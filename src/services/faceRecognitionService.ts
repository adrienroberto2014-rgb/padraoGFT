import * as faceapi from 'face-api.js';

const MODEL_URL = '/models';

let modelsLoaded = false;
let loadingPromise: Promise<void> | null = null;

export const loadModels = async () => {
  if (modelsLoaded) return;
  if (loadingPromise) return loadingPromise;
  
  loadingPromise = (async () => {
    try {
      // Try local first
      try {
        await Promise.race([
          Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
          ]),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Local timeout')), 5000))
        ]);
        console.log('Face-api models loaded from local /models');
      } catch (e) {
        console.warn('Local models failed or not found, falling back to CDN...', e);
        // Try a different CDN if the first one fails
        const CDN_URLS = [
          'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights',
          'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights',
          'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/',
          'https://vladmandic.github.io/face-api/model/'
        ];
        
        let loaded = false;
        for (const url of CDN_URLS) {
          try {
            console.log(`Trying to load models from: ${url}`);
            // Clean URL to ensure it ends with / if it's a directory
            const baseUrl = url.endsWith('/') ? url : `${url}/`;
            
            await Promise.race([
              Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(baseUrl),
                faceapi.nets.faceLandmark68Net.loadFromUri(baseUrl),
                faceapi.nets.faceRecognitionNet.loadFromUri(baseUrl),
              ]),
              new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout loading from ${url}`)), 20000))
            ]);
            console.log(`Face-api models loaded successfully from: ${url}`);
            loaded = true;
            break;
          } catch (err) {
            console.warn(`Failed to load from ${url}:`, err);
          }
        }
        
        if (!loaded) {
          throw new Error('Could not load face-api models from any source');
        }
      }
      modelsLoaded = true;
    } catch (error) {
      console.error('Error loading face-api models:', error);
      loadingPromise = null;
      throw error;
    }
  })();

  return loadingPromise;
};

export const getFaceDescriptor = async (videoElement: HTMLVideoElement) => {
  if (!modelsLoaded) await loadModels();
  
  const detection = await faceapi
    .detectSingleFace(videoElement, new faceapi.TinyFaceDetectorOptions({
      inputSize: 224, // Increased for better accuracy
      scoreThreshold: 0.3 // Lowered to detect faces more easily
    }))
    .withFaceLandmarks()
    .withFaceDescriptor();
    
  return detection;
};

export const compareFaces = (descriptor1: Float32Array, descriptor2: Float32Array) => {
  if (descriptor1.length !== descriptor2.length) {
    console.warn("Cannot compare faces: descriptors have different lengths", descriptor1.length, descriptor2.length);
    return false;
  }
  const distance = faceapi.euclideanDistance(descriptor1, descriptor2);
  return distance < 0.6; // Threshold for matching
};

export const createFaceMatcher = (labeledDescriptors: faceapi.LabeledFaceDescriptors[]) => {
  // Ensure all descriptors are valid before creating matcher
  const validDescriptors = labeledDescriptors.filter(ld => 
    ld.descriptors.every(d => d.length === 128)
  );
  return new faceapi.FaceMatcher(validDescriptors, 0.55); // Slightly more strict for matching, but detector is more sensitive
};

// --- Production Backend Integration ---

export const enrollFaceOnBackend = async (studentId: string, imageBase64: string) => {
  try {
    const response = await fetch('/api/face/enroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, image: imageBase64 }),
    });
    return await response.json();
  } catch (error) {
    console.error('Error enrolling face on backend:', error);
    throw error;
  }
};

export const verifyFaceOnBackend = async (imageBase64: string, tenantId?: string) => {
  try {
    const response = await fetch('/api/face/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageBase64, tenantId }),
    });
    return await response.json();
  } catch (error) {
    console.error('Error verifying face on backend:', error);
    throw error;
  }
};
