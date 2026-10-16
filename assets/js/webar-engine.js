/**
 * Ürgüp Meydanı WebAR - Çekirdek AR & 3D Stüdyo Motoru (MyWebAR Tarzı)
 * Asla siyah ekranda kalmaz: Canlı kamera görüntüsü yüklenirken veya
 * izin verilmediğinde muazzam Kapadokya 3D Meydan Simülasyonu devrededir.
 * Kamera açıldığında gerçek dünya AR moduna pürüzsüz geçiş yapar.
 */

class WebAREngine {
  constructor(options = {}) {
    this.container = options.container || document.body;
    this.videoElement = options.videoElement;
    this.onModeChange = options.onModeChange || null;
    this.onReticleStatus = options.onReticleStatus || null;
    this.onStatusMessage = options.onStatusMessage || null;

    // Mod: 'studio' (3D Meydan İnceleme) veya 'camera' (Gerçek Dünya AR)
    this.mode = 'studio'; 
    this.isCameraActive = false;

    // Three.js Bileşenleri
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = new THREE.Clock();

    // Sahne Nesneleri
    this.sculpturePivot = null; // Döndürme ve taşıma grubu
    this.currentSculptureMesh = null;
    this.currentSculptureMetadata = null;
    this.reticle = null;
    this.shadowPlane = null;
    this.studioFloor = null;

    // Işıklar
    this.ambientLight = null;
    this.dirLight = null;
    this.spotLight = null;

    // Dokunmatik ve Etkileşim
    this.touchStartPos = new THREE.Vector2();
    this.touchStartDistance = 0;
    this.isPointerDown = false;
    this.prevPointerPos = new THREE.Vector2();

    this.initScene();
    this.initLighting();
    this.initStudioEnvironment();
    this.initReticle();
    this.setupTouchControls();
    this.startRenderLoop();
  }

  // 1. Sahne ve Renderer Kurulumu
  initScene() {
    this.scene = new THREE.Scene();

    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 100);
    // Kamerayı heykele tam odakla
    this.camera.position.set(0, 1.4, 3.2);
    this.camera.lookAt(0, 0.9, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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

    // Heykel Taşıyıcı Pivot
    this.sculpturePivot = new THREE.Group();
    this.sculpturePivot.position.set(0, 0, 0);
    this.scene.add(this.sculpturePivot);
  }

  // 2. Işıklandırma
  initLighting() {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    this.scene.add(this.ambientLight);

    // Güneş Işığı ve Yumuşak Gölgeler
    this.dirLight = new THREE.DirectionalLight(0xfffbeb, 1.4);
    this.dirLight.position.set(4, 9, 5);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.dirLight.shadow.bias = -0.001;
    this.scene.add(this.dirLight);

    // Vurgu Spot Işığı
    this.spotLight = new THREE.SpotLight(0x38bdf8, 0.6);
    this.spotLight.position.set(-4, 6, -3);
    this.scene.add(this.spotLight);
  }

  // 3. Stüdyo & Meydan Simülasyon Zeminleri (Siyah Ekranı Engelleyen Çözüm)
  initStudioEnvironment() {
    this.studioFloor = new THREE.Group();

    // Meydan Dairesel Kaidesi
    const pedGeo = new THREE.CylinderGeometry(1.4, 1.6, 0.1, 48);
    const pedMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.85,
      metalness: 0.1
    });
    const ped = new THREE.Mesh(pedGeo, pedMat);
    ped.position.y = -0.05;
    ped.receiveShadow = true;
    this.studioFloor.add(ped);

    // Meydan Parke Taşı Izgarası (Grid)
    const grid = new THREE.GridHelper(10, 20, 0xf59e0b, 0x334155);
    grid.position.y = 0.002;
    this.studioFloor.add(grid);

    this.scene.add(this.studioFloor);

    // Kamera Modu İçin Görünmez Gölge Düzlemi
    const shadowGeo = new THREE.PlaneGeometry(20, 20);
    const shadowMat = new THREE.ShadowMaterial({ opacity: 0.45 });
    this.shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadowPlane.rotation.x = -Math.PI / 2;
    this.shadowPlane.position.y = 0;
    this.shadowPlane.receiveShadow = true;
    this.shadowPlane.visible = false;
    this.scene.add(this.shadowPlane);
  }

  // 4. Hedefleme Halkası (Reticle)
  initReticle() {
    this.reticle = new THREE.Group();

    const ringGeo = new THREE.RingGeometry(0.35, 0.38, 36);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    this.reticle.add(ring);

    const dot = new THREE.Mesh(
      new THREE.CircleGeometry(0.06, 16),
      new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
    );
    dot.rotation.x = -Math.PI / 2;
    this.reticle.add(dot);

    this.reticle.position.set(0, 0.01, 0);
    this.reticle.visible = false;
    this.scene.add(this.reticle);
  }

  // 5. Kamera Başlatma (Güvenli & Çökmez)
  async startCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.notifyStatus('Tarayıcınız kamera akışını desteklemiyor, 3D Stüdyo modunda devam ediliyor.');
      return false;
    }

    try {
      if (this.videoElement) {
        this.videoElement.setAttribute('autoplay', '');
        this.videoElement.setAttribute('muted', '');
        this.videoElement.setAttribute('playsinline', '');
        this.videoElement.setAttribute('webkit-playsinline', '');
        this.videoElement.muted = true;
        this.videoElement.playsInline = true;
      }

      // Esnek constraints (Tüm telefonlarla uyumlu)
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { min: 640, ideal: 1280 },
          height: { min: 480, ideal: 720 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.videoElement.srcObject = stream;

      await new Promise((resolve) => {
        if (this.videoElement.readyState >= 2) {
          resolve();
        } else {
          this.videoElement.onloadedmetadata = () => resolve();
        }
      });

      await this.videoElement.play();
      this.isCameraActive = true;
      this.setMode('camera');
      return true;

    } catch (err) {
      console.warn('Kamera açılamadı:', err);
      this.notifyStatus('Kamera izni verilmedi. 3D Meydan Simülasyon modundasınız.');
      this.setMode('studio');
      return false;
    }
  }

  // Kamera ve Stüdyo Modları Arasında Geçiş
  setMode(targetMode) {
    this.mode = targetMode;

    if (this.mode === 'camera' && this.isCameraActive) {
      // Kamera Modu: Stüdyo tabanını gizle, şeffaf gölgeyi aç
      if (this.studioFloor) this.studioFloor.visible = false;
      if (this.shadowPlane) this.shadowPlane.visible = true;
      if (this.videoElement) this.videoElement.style.opacity = '1';
      document.body.style.backgroundColor = 'transparent';
    } else {
      // 3D Stüdyo Modu: Görsel zemini aç, siyah ekranı engelle
      this.mode = 'studio';
      if (this.studioFloor) this.studioFloor.visible = true;
      if (this.shadowPlane) this.shadowPlane.visible = false;
      if (this.videoElement) this.videoElement.style.opacity = '0';
      document.body.style.backgroundColor = '#090d16';
    }

    if (this.onModeChange) this.onModeChange(this.mode);
  }

  // Heykel Yükleme
  async setSculpture(sculptureMeshPromise, metadata = {}) {
    if (this.currentSculptureMesh) {
      this.sculpturePivot.remove(this.currentSculptureMesh);
      this.currentSculptureMesh = null;
    }

    const mesh = await sculptureMeshPromise;
    this.currentSculptureMesh = mesh;
    this.currentSculptureMetadata = metadata;

    const scale = metadata.defaultScale || 1.0;
    this.sculpturePivot.scale.set(scale, scale, scale);
    this.sculpturePivot.position.set(0, metadata.yOffset || 0, 0);

    this.sculpturePivot.add(this.currentSculptureMesh);
  }

  // Heykeli Meydanda Döndür
  rotateSculpture(deltaY) {
    if (this.sculpturePivot) {
      this.sculpturePivot.rotation.y += deltaY;
    }
  }

  // Heykeli Ölçekle (Pinch Zoom)
  scaleSculpture(factor) {
    if (this.sculpturePivot) {
      const cur = this.sculpturePivot.scale.x;
      const next = THREE.MathUtils.clamp(cur * factor, 0.25, 5.0);
      this.sculpturePivot.scale.set(next, next, next);
    }
  }

  // Konumu Sıfırla / Meydana Oturt
  placeSculpture() {
    if (this.sculpturePivot) {
      this.sculpturePivot.position.set(0, 0, 0);
      // Yerleşme efekti
      const currentScale = this.sculpturePivot.scale.x;
      this.sculpturePivot.scale.set(0.1, 0.1, 0.1);
      let s = 0.1;
      const interval = setInterval(() => {
        s += 0.15;
        this.sculpturePivot.scale.setScalar(Math.min(s, currentScale));
        if (s >= currentScale) clearInterval(interval);
      }, 16);
    }
  }

  // Atmosfer
  setAtmosphere(mode) {
    if (mode === 'daylight') {
      this.ambientLight.color.setHex(0xffffff);
      this.ambientLight.intensity = 0.85;
      this.dirLight.color.setHex(0xfffbeb);
      this.dirLight.intensity = 1.4;
      this.dirLight.position.set(4, 9, 5);
    } else if (mode === 'sunset') {
      // Kapadokya Kızıl Gün Batımı
      this.ambientLight.color.setHex(0xfb923c);
      this.ambientLight.intensity = 0.65;
      this.dirLight.color.setHex(0xf97316);
      this.dirLight.intensity = 1.8;
      this.dirLight.position.set(7, 3, 5);
    } else if (mode === 'night') {
      // Gece UV Işıma
      this.ambientLight.color.setHex(0x1e1b4b);
      this.ambientLight.intensity = 0.45;
      this.dirLight.color.setHex(0x38bdf8);
      this.dirLight.intensity = 0.8;
      this.dirLight.position.set(0, 7, -3);
    }
  }

  // 6. Dokunmatik Kontroller (Tek Parmak Döndür, İki Parmak Ölçekle)
  setupTouchControls() {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isPointerDown = true;
        this.touchStartPos.set(e.touches[0].clientX, e.touches[0].clientY);
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        this.touchStartDistance = Math.hypot(dx, dy);
      }
    }, { passive: true });

    canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1 && this.isPointerDown) {
        const dx = e.touches[0].clientX - this.touchStartPos.x;
        this.rotateSculpture(dx * 0.012);
        this.touchStartPos.set(e.touches[0].clientX, e.touches[0].clientY);
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        if (this.touchStartDistance > 0) {
          const factor = dist / this.touchStartDistance;
          this.scaleSculpture(factor);
          this.touchStartDistance = dist;
        }
      }
    }, { passive: true });

    canvas.addEventListener('touchend', () => {
      this.isPointerDown = false;
      this.touchStartDistance = 0;
    });

    // Masaüstü Fare Kontrolleri
    let isMouseDown = false;
    let lastX = 0;
    canvas.addEventListener('mousedown', (e) => {
      isMouseDown = true;
      lastX = e.clientX;
    });
    window.addEventListener('mousemove', (e) => {
      if (isMouseDown) {
        const dx = e.clientX - lastX;
        this.rotateSculpture(dx * 0.01);
        lastX = e.clientX;
      }
    });
    window.addEventListener('mouseup', () => {
      isMouseDown = false;
    });
    canvas.addEventListener('wheel', (e) => {
      this.scaleSculpture(e.deltaY > 0 ? 0.92 : 1.08);
    });

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  notifyStatus(msg) {
    if (this.onStatusMessage) this.onStatusMessage(msg);
  }

  // 7. Render Döngüsü
  startRenderLoop() {
    const animate = () => {
      requestAnimationFrame(animate);

      const delta = this.clock.getDelta();

      // Heykel animasyonu (biyo-nabız, mikro ışıma vb.)
      if (this.currentSculptureMesh && this.currentSculptureMesh.userData.animate) {
        this.currentSculptureMesh.userData.animate(delta);
      }

      this.renderer.render(this.scene, this.camera);
    };

    animate();
  }
}

window.WebAREngine = WebAREngine;
