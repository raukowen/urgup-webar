/**
 * Ürgüp Meydanı WebAR - A4 Kaide (Marker) ve Zemin Takip Motoru
 * A4 kağıdı üzerindeki takip işaretini (Hiro Marker) algılayarak
 * 3D heykeli doğrudan kağıdın üzerine santim şaşmadan kilitler.
 */

class WebAREngine {
  constructor(options = {}) {
    this.container = options.container || document.body;
    this.onTrackingStatus = options.onTrackingStatus || null;
    this.onStatusMessage = options.onStatusMessage || null;

    // Mod: 'marker' (A4 Kağıdı Takibi) veya 'world' (Serbest Meydan Takibi)
    this.mode = 'marker'; 
    this.isCameraRunning = false;

    // Three.js Bileşenleri
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = new THREE.Clock();

    // AR.js Nesneleri
    this.arToolkitSource = null;
    this.arToolkitContext = null;
    this.arMarkerControls = null;
    this.markerRoot = null;
    this.freeRoot = null;

    // Heykel Taşıyıcı
    this.currentSculptureMesh = null;
    this.currentSculptureMetadata = null;
    this.sculptureGroup = null;

    // Işıklar
    this.ambientLight = null;
    this.dirLight = null;

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

  // 1. Sahne & Şeffaf Renderer Kurulumu
  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = null;

    this.camera = new THREE.Camera();
    this.scene.add(this.camera);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0); // Tam şeffaf
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

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

  // 2. Işıklandırma
  initLighting() {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    this.scene.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight(0xfffbeb, 1.6);
    this.dirLight.position.set(4, 10, 5);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.dirLight.shadow.bias = -0.001;
    this.scene.add(this.dirLight);
  }

  // 3. Takip Kök Grupları (Marker ve Serbest Mod)
  initRoots() {
    // 1) A4 Kağıdına Kilitlenen Kök
    this.markerRoot = new THREE.Group();
    this.markerRoot.name = 'a4_marker_root';
    this.scene.add(this.markerRoot);

    // Kağıt üzerindeki gölge alıcı zemin
    const shadowGeo = new THREE.PlaneGeometry(3, 3);
    const shadowMat = new THREE.ShadowMaterial({ opacity: 0.45 });
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.receiveShadow = true;
    this.markerRoot.add(shadowPlane);

    // Kılavuz Altın Çerçeve (A4 boyutunu gösterir)
    const frameGeo = new THREE.RingGeometry(0.65, 0.68, 4);
    const frameMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.rotation.x = -Math.PI / 2;
    frame.rotation.z = Math.PI / 4;
    frame.position.y = 0.01;
    this.markerRoot.add(frame);

    // 2) Kağıtsız Serbest Sabitleme Kökü
    this.freeRoot = new THREE.Group();
    this.freeRoot.position.set(0, -0.5, -2.5);
    this.freeRoot.visible = false;
    this.scene.add(this.freeRoot);

    // Heykel Grubu
    this.sculptureGroup = new THREE.Group();
    this.markerRoot.add(this.sculptureGroup);
  }

  // 4. A4 Kaide AR Motorunu Başlat (Kamera + Bilgisayarlı Görme)
  async startCamera() {
    return new Promise((resolve) => {
      try {
        // AR Toolkit Kaynak (Webcam)
        this.arToolkitSource = new THREEx.ArToolkitSource({
          sourceType: 'webcam'
        });

        this.arToolkitSource.init(() => {
          setTimeout(() => {
            this.onResize();
            this.isCameraRunning = true;

            // Kamera videosunu arka plana tam ekran yerleştir
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
          }, 300);
        });

        // AR Toolkit Bağlamı (Kamera Kalibrasyonu)
        this.arToolkitContext = new THREEx.ArToolkitContext({
          cameraParametersUrl: 'assets/data/camera_para.dat',
          detectionMode: 'mono',
          maxDetectionRate: 60,
          canvasWidth: 640,
          canvasHeight: 480
        });

        this.arToolkitContext.init(() => {
          this.camera.projectionMatrix.copy(this.arToolkitContext.getProjectionMatrix());
        });

        // Hiro Marker Kontrolleri (A4 Kağıdı)
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

    // A4 kağıdı üzerinde 1 birim ~ 14 cm kaide ölçeğindedir
    const scale = (metadata.defaultScale || 1.0) * 0.9;
    this.sculptureGroup.scale.set(scale, scale, scale);
    this.sculptureGroup.position.set(0, metadata.yOffset || 0, 0);

    this.sculptureGroup.add(this.currentSculptureMesh);
  }

  // Heykeli Kağıtsız Mevcut Bakışa Sabitle (Serbest Mod)
  lockToCurrentView() {
    if (this.mode === 'marker') {
      // Marker modundan Serbest Moda geç
      this.mode = 'world';
      this.markerRoot.remove(this.sculptureGroup);
      this.freeRoot.add(this.sculptureGroup);
      this.freeRoot.visible = true;
      this.sculptureGroup.scale.setScalar(1.2);
      this.sculptureGroup.position.set(0, 0, 0);
      this.notifyStatus('📍 Heykel ekranda sabitlendi (Kağıtsız mod).');
      if (this.onTrackingStatus) this.onTrackingStatus(true, 'Serbest Sabitlendi');
    } else {
      // Yeniden A4 Kağıdı moduna dön
      this.mode = 'marker';
      this.freeRoot.remove(this.sculptureGroup);
      this.markerRoot.add(this.sculptureGroup);
      this.freeRoot.visible = false;
      this.sculptureGroup.scale.setScalar(0.9);
      this.notifyStatus('📄 A4 Kaide moduna geçildi. Kağıdı kameraya gösterin.');
    }
  }

  // Heykeli Döndür & Boyutlandır
  rotateSculpture(deltaY) {
    if (this.sculptureGroup) {
      this.sculptureGroup.rotation.y += deltaY;
    }
  }

  scaleSculpture(factor) {
    if (this.sculptureGroup) {
      const cur = this.sculptureGroup.scale.x;
      const next = THREE.MathUtils.clamp(cur * factor, 0.2, 5.0);
      this.sculptureGroup.scale.set(next, next, next);
    }
  }

  // Atmosfer Işık Ayarı
  setAtmosphere(mode) {
    if (mode === 'daylight') {
      this.ambientLight.color.setHex(0xffffff);
      this.ambientLight.intensity = 0.95;
      this.dirLight.color.setHex(0xfffbeb);
      this.dirLight.intensity = 1.6;
    } else if (mode === 'sunset') {
      this.ambientLight.color.setHex(0xfb923c);
      this.ambientLight.intensity = 0.75;
      this.dirLight.color.setHex(0xf97316);
      this.dirLight.intensity = 1.8;
    } else if (mode === 'night') {
      this.ambientLight.color.setHex(0x1e1b4b);
      this.ambientLight.intensity = 0.5;
      this.dirLight.color.setHex(0x38bdf8);
      this.dirLight.intensity = 0.9;
    }
  }

  // 6. Pencere Boyutlandırma
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
        this.rotateSculpture(dx * 0.015);
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

  // 7. Ana Render & Takip Döngüsü
  startRenderLoop() {
    let wasVisible = false;

    const animate = () => {
      requestAnimationFrame(animate);

      const delta = this.clock.getDelta();

      // AR Takip Güncellemesi
      if (this.arToolkitSource && this.arToolkitSource.ready) {
        this.arToolkitContext.update(this.arToolkitSource.domElement);
      }

      // Marker Modunda Takip Durumu Kontrolü
      if (this.mode === 'marker') {
        const isVisible = this.markerRoot.visible;
        if (isVisible !== wasVisible) {
          wasVisible = isVisible;
          if (this.onTrackingStatus) {
            this.onTrackingStatus(isVisible, isVisible ? 'A4 Kaidesi Kilitlendi' : 'A4 Kağıdını Gösterin...');
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
