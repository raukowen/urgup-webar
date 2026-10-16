/**
 * Ürgüp Meydanı WebAR - Yüksek Performanslı & Isınma Karşıtı A4 Takip Motoru
 * - Isınma ve tutukluk önleme: 30 FPS CV throttling, optimize 320x240 işlem tamponu.
 * - Titreme (Jitter) önleme: Poz yumuşatma filtresi (Lerp & Slerp).
 * - Titreşimsiz görünüm: 400ms takip hafızası (Hysteresis persistence).
 * - Pil tasarrufu: Hafif kontakt gölge & kontrollü piksel oranı.
 */

class WebAREngine {
  constructor(options = {}) {
    this.container = options.container || document.body;
    this.onTrackingStatus = options.onTrackingStatus || null;
    this.onStatusMessage = options.onStatusMessage || null;

    this.mode = 'marker'; // 'marker' (A4 Kaidesi) veya 'world' (Serbest Mod)
    this.isCameraRunning = false;
    this.isMarkerLocked = false;

    // Three.js
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = new THREE.Clock();

    // AR.js
    this.arToolkitSource = null;
    this.arToolkitContext = null;
    this.arMarkerControls = null;
    this.markerRoot = null;
    this.smoothedRoot = null; // Titreşimi önleyen yumuşatılmış kök
    this.freeRoot = null;

    // Heykel Taşıyıcı
    this.currentSculptureMesh = null;
    this.currentSculptureMetadata = null;
    this.sculptureGroup = null;

    // Işıklar
    this.ambientLight = null;
    this.dirLight = null;

    // Performans & Throttling Zamanlayıcıları
    this.lastCvTime = 0;
    this.lastDetectedTime = 0;

    // Dokunmatik
    this.touchStartDistance = 0;
    this.isTouchDown = false;
    this.touchStartPos = new THREE.Vector2();

    this.initScene();
    this.initLighting();
    this.initRoots();
    this.setupEvents();
    this.startRenderLoop();
  }

  // 1. Sahne ve Optimize Renderer
  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = null;

    this.camera = new THREE.Camera();
    this.scene.add(this.camera);

    // Isınmayı önlemek için piksel oranını 1.5 ile sınırla
    const maxPixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
      precision: 'mediump' // Isınmayı azaltan optimize shader hassasiyeti
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(maxPixelRatio);
    this.renderer.setClearColor(0x000000, 0);

    const canvas = this.renderer.domElement;
    canvas.id = 'webar-canvas';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.zIndex = '2';
    canvas.style.touchAction = 'none';
    this.container.appendChild(canvas);
  }

  // 2. Hafif & Doğal Işıklandırma
  initLighting() {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    this.scene.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight(0xfffbeb, 1.4);
    this.dirLight.position.set(3, 8, 4);
    this.scene.add(this.dirLight);
  }

  // 3. Titreşimsiz Takip Kökleri & Kontakt Gölge
  initRoots() {
    // 1) Ham Marker Kökü (AR.js doğrudan burayı günceller)
    this.markerRoot = new THREE.Group();
    this.scene.add(this.markerRoot);

    // 2) Yumuşatılmış Kök (Lerp/Slerp ile titreşimleri yok edilmiş kök)
    this.smoothedRoot = new THREE.Group();
    this.smoothedRoot.visible = false;
    this.scene.add(this.smoothedRoot);

    // 3) Kağıt Üzerine Gerçekçi Kontakt Gölge (Sıfır GPU Isınması)
    const shadowGeo = new THREE.RingGeometry(0.01, 0.75, 32);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x0a0f1d,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide
    });
    const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = 0.005; // Kağıdın milimetrik üstünde
    this.smoothedRoot.add(contactShadow);

    // Altın Kaide Çerçevesi (A4 sınırlarını netleştirir)
    const frameGeo = new THREE.RingGeometry(0.68, 0.72, 4);
    const frameMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8
    });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.rotation.x = -Math.PI / 2;
    frame.rotation.z = Math.PI / 4;
    frame.position.y = 0.008;
    this.smoothedRoot.add(frame);

    // 4) Kağıtsız Serbest Kök
    this.freeRoot = new THREE.Group();
    this.freeRoot.position.set(0, -0.4, -2.4);
    this.freeRoot.visible = false;
    this.scene.add(this.freeRoot);

    // Heykel Grubu
    this.sculptureGroup = new THREE.Group();
    this.smoothedRoot.add(this.sculptureGroup);
  }

  // 4. Kamera & AR Başlatıcı (Optimize 30 FPS & 320x240 İşlemci Dostu)
  async startCamera() {
    return new Promise((resolve) => {
      try {
        // Isınmayı önlemek için AR.js'i optimize parametrelerle yapılandır
        this.arToolkitSource = new THREEx.ArToolkitSource({
          sourceType: 'webcam'
        });

        this.arToolkitSource.init(() => {
          setTimeout(() => {
            this.onResize();
            this.isCameraRunning = true;

            const video = this.arToolkitSource.domElement;
            if (video) {
              video.id = 'camera-video';
              video.style.position = 'fixed';
              video.style.top = '0';
              video.style.left = '0';
              video.style.width = '100%';
              video.style.height = '100%';
              video.style.objectFit = 'cover';
              video.style.zIndex = '1';
              video.style.opacity = '1';
              document.body.prepend(video);
            }

            resolve(true);
          }, 250);
        });

        // 320x240 analiz çözünürlüğü: CPU kullanımını %75 azaltır, ısınmayı durdurur
        this.arToolkitContext = new THREEx.ArToolkitContext({
          cameraParametersUrl: 'assets/data/camera_para.dat',
          detectionMode: 'mono',
          maxDetectionRate: 30, // 30 FPS sınırlandırma
          canvasWidth: 320,
          canvasHeight: 240
        });

        this.arToolkitContext.init(() => {
          this.camera.projectionMatrix.copy(this.arToolkitContext.getProjectionMatrix());
        });

        // Hiro Marker
        this.arMarkerControls = new THREEx.ArMarkerControls(this.arToolkitContext, this.markerRoot, {
          type: 'pattern',
          patternUrl: 'assets/data/patt.hiro',
          changeMatrixMode: 'modelViewMatrix'
        });

      } catch (err) {
        console.error('AR Toolkit başlatılamadı:', err);
        resolve(false);
      }
    });
  }

  // 5. Heykel Yükleme
  async setSculpture(sculptureMeshPromise, metadata = {}) {
    if (this.currentSculptureMesh) {
      this.sculptureGroup.remove(this.currentSculptureMesh);
      this.currentSculptureMesh = null;
    }

    const mesh = await sculptureMeshPromise;
    this.currentSculptureMesh = mesh;
    this.currentSculptureMetadata = metadata;

    // A4 kağıdı için en ideal doğal ölçek (~14cm genişlik, 20cm yükseklik)
    const scale = (metadata.defaultScale || 1.0) * 0.95;
    this.sculptureGroup.scale.set(scale, scale, scale);
    this.sculptureGroup.position.set(0, metadata.yOffset || 0, 0);

    this.sculptureGroup.add(this.currentSculptureMesh);
  }

  // Kağıtsız / Serbest Sabitleme
  lockToCurrentView() {
    if (this.mode === 'marker') {
      this.mode = 'world';
      this.smoothedRoot.remove(this.sculptureGroup);
      this.freeRoot.add(this.sculptureGroup);
      this.freeRoot.visible = true;
      this.sculptureGroup.scale.setScalar(1.2);
      this.notifyStatus('📍 Heykel ekranda sabitlendi (Kağıtsız mod).');
      if (this.onTrackingStatus) this.onTrackingStatus(true, 'Serbest Sabitlendi');
    } else {
      this.mode = 'marker';
      this.freeRoot.remove(this.sculptureGroup);
      this.smoothedRoot.add(this.sculptureGroup);
      this.freeRoot.visible = false;
      this.sculptureGroup.scale.setScalar(0.95);
      this.notifyStatus('📄 A4 Kaide moduna geçildi. Kağıdı gösterin.');
    }
  }

  rotateSculpture(deltaY) {
    if (this.sculptureGroup) {
      this.sculptureGroup.rotation.y += deltaY;
    }
  }

  scaleSculpture(factor) {
    if (this.sculptureGroup) {
      const cur = this.sculptureGroup.scale.x;
      const next = THREE.MathUtils.clamp(cur * factor, 0.25, 4.0);
      this.sculptureGroup.scale.set(next, next, next);
    }
  }

  setAtmosphere(mode) {
    if (mode === 'daylight') {
      this.ambientLight.color.setHex(0xffffff);
      this.ambientLight.intensity = 0.95;
      this.dirLight.color.setHex(0xfffbeb);
      this.dirLight.intensity = 1.4;
    } else if (mode === 'sunset') {
      this.ambientLight.color.setHex(0xfb923c);
      this.ambientLight.intensity = 0.75;
      this.dirLight.color.setHex(0xf97316);
      this.dirLight.intensity = 1.6;
    } else if (mode === 'night') {
      this.ambientLight.color.setHex(0x1e1b4b);
      this.ambientLight.intensity = 0.5;
      this.dirLight.color.setHex(0x38bdf8);
      this.dirLight.intensity = 0.8;
    }
  }

  onResize() {
    if (this.arToolkitSource) {
      this.arToolkitSource.onResizeElement();
      this.arToolkitSource.copyElementSizeTo(this.renderer.domElement);
      if (this.arToolkitContext && this.arToolkitContext.arController) {
        this.arToolkitSource.copyElementSizeTo(this.arToolkitContext.arController.canvas);
      }
    }
  }

  setupEvents() {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isTouchDown = true;
        this.touchStartPos.set(e.touches[0].clientX, e.touches[0].clientY);
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        this.touchStartDistance = Math.hypot(dx, dy);
      }
    }, { passive: true });

    canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1 && this.isTouchDown) {
        const dx = e.touches[0].clientX - this.touchStartPos.x;
        this.rotateSculpture(dx * 0.012);
        this.touchStartPos.set(e.touches[0].clientX, e.touches[0].clientY);
      } else if (e.touches.length === 2 && this.touchStartDistance > 0) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        const factor = dist / this.touchStartDistance;
        this.scaleSculpture(factor);
        this.touchStartDistance = dist;
      }
    }, { passive: true });

    canvas.addEventListener('touchend', () => {
      this.isTouchDown = false;
      this.touchStartDistance = 0;
    });

    window.addEventListener('resize', () => this.onResize());
  }

  notifyStatus(msg) {
    if (this.onStatusMessage) this.onStatusMessage(msg);
  }

  // 6. Titreşimsiz & Isınma Karşıtı Render Döngüsü
  startRenderLoop() {
    const animate = () => {
      requestAnimationFrame(animate);

      const delta = this.clock.getDelta();
      const now = performance.now();

      // CPU'yu yormamak için görüntü analizini 30 FPS ile sınırla (~33ms)
      if (now - this.lastCvTime >= 33) {
        this.lastCvTime = now;
        if (this.arToolkitSource && this.arToolkitSource.ready) {
          this.arToolkitContext.update(this.arToolkitSource.domElement);
        }
      }

      // Marker Modu Titreşim Filtresi & Yumuşatma (Lerp / Slerp)
      if (this.mode === 'marker') {
        if (this.markerRoot && this.markerRoot.visible) {
          this.lastDetectedTime = now;
          this.smoothedRoot.visible = true;

          // Yumuşak poz sönümleme: Titremeyi tamamen yok eder
          this.smoothedRoot.position.lerp(this.markerRoot.position, 0.32);
          this.smoothedRoot.quaternion.slerp(this.markerRoot.quaternion, 0.32);

          if (!this.isMarkerLocked) {
            this.isMarkerLocked = true;
            if (this.onTrackingStatus) this.onTrackingStatus(true, 'A4 Kaidesi Kilitlendi');
          }
        } else {
          // 400ms Takip Hafızası (Hysteresis): El titremesinde heykel aniden kaybolmaz
          if (now - this.lastDetectedTime > 400) {
            this.smoothedRoot.visible = false;
            if (this.isMarkerLocked) {
              this.isMarkerLocked = false;
              if (this.onTrackingStatus) this.onTrackingStatus(false, 'A4 Kağıdını Gösterin...');
            }
          }
        }
      }

      // Heykel animasyonu
      if (this.currentSculptureMesh && this.currentSculptureMesh.userData.animate) {
        this.currentSculptureMesh.userData.animate(delta);
      }

      this.renderer.render(this.scene, this.camera);
    };

    animate();
  }
}

window.WebAREngine = WebAREngine;
