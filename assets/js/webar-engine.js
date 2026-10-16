/**
 * Ürgüp Meydanı WebAR - Dünya & Zemin Takip Motoru (MyWebAR / Point Cloud Tracking Tarzı)
 * Video referansındaki gibi: Canlı kamera arka planı, jiroskop sensör eşlemesi (DeviceOrientation),
 * şeffaf gölge düzlemi (Shadow Receiver) ve gerçek dünyada sabit kalan 3D heykel.
 */

class WebAREngine {
  constructor(options = {}) {
    this.container = options.container || document.body;
    this.videoElement = options.videoElement;
    this.onTrackingStatus = options.onTrackingStatus || null;
    this.onStatusMessage = options.onStatusMessage || null;

    // Three.js Çekirdeği
    this.scene = null;
    this.camera = null;
    this.cameraContainer = null; // Jiroskop oryantasyonu için taşıyıcı
    this.renderer = null;
    this.clock = new THREE.Clock();

    // Sahne Nesneleri
    this.sculpturePivot = null;
    this.currentSculptureMesh = null;
    this.currentSculptureMetadata = null;
    this.shadowPlane = null;
    this.reticle = null;

    // Işıklar
    this.ambientLight = null;
    this.dirLight = null;

    // Jiroskop ve Sensör Değişkenleri
    this.hasOrientation = false;
    this.deviceOrientation = { alpha: 0, beta: 0, gamma: 0 };
    this.screenOrientation = window.orientation || 0;
    this.isTracking = false;

    // Dokunmatik ve Etkileşim
    this.touchStartDistance = 0;
    this.isTouchDown = false;
    this.touchStartPos = new THREE.Vector2();

    this.initScene();
    this.initLighting();
    this.initShadowPlane();
    this.initReticle();
    this.setupEvents();
    this.startRenderLoop();
  }

  // 1. Üç Boyutlu Sahne ve Şeffaf Renderer Kurulumu
  initScene() {
    this.scene = new THREE.Scene();
    // Sahne arka planı NULL olmalı ki arkadaki kamera videosu görünsün!
    this.scene.background = null;

    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.05, 100);

    // Kamera Taşıyıcı Grubu (Jiroskop için standart Three.js yapısı)
    this.cameraContainer = new THREE.Group();
    this.cameraContainer.position.set(0, 1.4, 0); // Göz hizası
    this.cameraContainer.add(this.camera);
    this.scene.add(this.cameraContainer);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true, // Şeffaf zemin
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

    // Heykel Taşıyıcı Pivot Grubu (Kameranın 2.2 metre önüne yerleştirilir)
    this.sculpturePivot = new THREE.Group();
    this.sculpturePivot.position.set(0, 0, -2.2);
    this.scene.add(this.sculpturePivot);
  }

  // 2. Güneş Işığı ve Gölgeler
  initLighting() {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    this.scene.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight(0xfffbeb, 1.5);
    this.dirLight.position.set(5, 12, 6);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 25;
    this.dirLight.shadow.camera.left = -4;
    this.dirLight.shadow.camera.right = 4;
    this.dirLight.shadow.camera.top = 4;
    this.dirLight.shadow.camera.bottom = -4;
    this.dirLight.shadow.bias = -0.001;
    this.scene.add(this.dirLight);
  }

  // 3. Gerçek Dünya Gölge Düzlemi (Meydan zeminine heykelin gölgesini düşürür)
  initShadowPlane() {
    const shadowGeo = new THREE.PlaneGeometry(30, 30);
    const shadowMat = new THREE.ShadowMaterial({ opacity: 0.42 });
    this.shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadowPlane.rotation.x = -Math.PI / 2;
    this.shadowPlane.position.y = 0;
    this.shadowPlane.receiveShadow = true;
    this.scene.add(this.shadowPlane);
  }

  // 4. Hedefleme Dairesi (Reticle)
  initReticle() {
    this.reticle = new THREE.Group();

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.32, 0.36, 36),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    this.reticle.add(ring);

    const dot = new THREE.Mesh(
      new THREE.CircleGeometry(0.06, 16),
      new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
    );
    dot.rotation.x = -Math.PI / 2;
    this.reticle.add(dot);

    this.reticle.position.set(0, 0.01, -2.2);
    this.reticle.visible = true;
    this.scene.add(this.reticle);
  }

  // 5. Kamerayı Başlat (Safari iOS & Android Uyumlu)
  async startCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.notifyStatus('Tarayıcınız kamera akışını desteklemiyor.');
      return false;
    }

    try {
      if (this.videoElement) {
        this.videoElement.autoplay = true;
        this.videoElement.playsInline = true;
        this.videoElement.muted = true;
        this.videoElement.setAttribute('autoplay', '');
        this.videoElement.setAttribute('playsinline', '');
        this.videoElement.setAttribute('webkit-playsinline', '');
        this.videoElement.setAttribute('muted', '');
      }

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
      this.isTracking = true;

      // Kamera videosu ekranda görünür olsun
      this.videoElement.style.opacity = '1';

      if (this.onTrackingStatus) {
        this.onTrackingStatus(true);
      }
      return true;

    } catch (err) {
      console.warn('Arka kamera açılamadı, alternatif kamera deneniyor:', err);
      try {
        const stream2 = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        this.videoElement.srcObject = stream2;
        await this.videoElement.play();
        this.isTracking = true;
        this.videoElement.style.opacity = '1';
        if (this.onTrackingStatus) this.onTrackingStatus(true);
        return true;
      } catch (err2) {
        console.error('Kamera erişimi reddedildi:', err2);
        this.notifyStatus('Lütfen tarayıcı ayarlarından kamera iznini onaylayın.');
        if (this.onTrackingStatus) this.onTrackingStatus(false);
        return false;
      }
    }
  }

  // 6. Jiroskop & Dünya Takibi İzni (iOS 13+ ve Android)
  async enableSensors() {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission === 'granted') {
          window.addEventListener('deviceorientation', (e) => this.onOrientationEvent(e), true);
          this.hasOrientation = true;
          return true;
        }
      } catch (e) {
        console.warn('Jiroskop izni alınamadı:', e);
      }
    } else if ('ondeviceorientation' in window) {
      window.addEventListener('deviceorientation', (e) => this.onOrientationEvent(e), true);
      this.hasOrientation = true;
      return true;
    }
    return false;
  }

  onOrientationEvent(event) {
    if (event.alpha !== null && event.beta !== null) {
      this.hasOrientation = true;
      this.deviceOrientation.alpha = event.alpha;
      this.deviceOrientation.beta = event.beta;
      this.deviceOrientation.gamma = event.gamma || 0;
    }
  }

  // 7. Heykeli Yükle
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
    this.sculpturePivot.position.y = metadata.yOffset || 0;

    this.sculpturePivot.add(this.currentSculptureMesh);
  }

  // Heykeli Yeniden Konumlandır (Tap to place / Raycast)
  placeAtCurrentView() {
    if (!this.sculpturePivot) return;

    // Kameranın baktığı yönde 2 metre önündeki zemin noktasına sabitle
    const forward = new THREE.Vector3(0, 0, -2.2);
    forward.applyQuaternion(this.camera.quaternion);
    forward.y = 0; // Zeminde tut

    this.sculpturePivot.position.set(
      this.cameraContainer.position.x + forward.x,
      0,
      this.cameraContainer.position.z + forward.z
    );

    // Animasyonlu sıçrama
    const targetScale = this.currentSculptureMetadata?.defaultScale || 1.0;
    this.sculpturePivot.scale.set(0.1, 0.1, 0.1);
    let s = 0.1;
    const interval = setInterval(() => {
      s += 0.15;
      this.sculpturePivot.scale.setScalar(Math.min(s, targetScale));
      if (s >= targetScale) clearInterval(interval);
    }, 16);
  }

  // Heykel Boyutlandırma (Pinch)
  scaleSculpture(factor) {
    if (this.sculpturePivot) {
      const cur = this.sculpturePivot.scale.x;
      const next = THREE.MathUtils.clamp(cur * factor, 0.2, 5.0);
      this.sculpturePivot.scale.set(next, next, next);
    }
  }

  // Heykel Döndürme
  rotateSculpture(deltaY) {
    if (this.sculpturePivot) {
      this.sculpturePivot.rotation.y += deltaY;
    }
  }

  // Atmosfer Işığı
  setAtmosphere(mode) {
    if (mode === 'daylight') {
      this.ambientLight.color.setHex(0xffffff);
      this.ambientLight.intensity = 0.9;
      this.dirLight.color.setHex(0xfffbeb);
      this.dirLight.intensity = 1.5;
      this.dirLight.position.set(5, 12, 6);
    } else if (mode === 'sunset') {
      this.ambientLight.color.setHex(0xfb923c);
      this.ambientLight.intensity = 0.7;
      this.dirLight.color.setHex(0xf97316);
      this.dirLight.intensity = 1.8;
      this.dirLight.position.set(8, 4, 5);
    } else if (mode === 'night') {
      this.ambientLight.color.setHex(0x1e1b4b);
      this.ambientLight.intensity = 0.45;
      this.dirLight.color.setHex(0x38bdf8);
      this.dirLight.intensity = 0.8;
      this.dirLight.position.set(0, 8, -4);
    }
  }

  // 8. Dokunmatik Olaylar
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

    // Masaüstü fare desteği
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

    window.addEventListener('orientationchange', () => {
      this.screenOrientation = window.orientation || 0;
    });
  }

  notifyStatus(msg) {
    if (this.onStatusMessage) this.onStatusMessage(msg);
  }

  // 9. Ana Render ve Jiroskop Takip Döngüsü
  startRenderLoop() {
    const zee = new THREE.Vector3(0, 0, 1);
    const euler = new THREE.Euler();
    const q0 = new THREE.Quaternion();
    const q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)); // -PI/2 X ekseni

    const animate = () => {
      requestAnimationFrame(animate);

      const delta = this.clock.getDelta();

      // Jiroskop ile telefon hareketini 1:1 kamera açısına eşle
      if (this.hasOrientation) {
        const alpha = THREE.MathUtils.degToRad(this.deviceOrientation.alpha || 0);
        const beta = THREE.MathUtils.degToRad(this.deviceOrientation.beta || 0);
        const gamma = THREE.MathUtils.degToRad(this.deviceOrientation.gamma || 0);
        const orient = THREE.MathUtils.degToRad(this.screenOrientation || 0);

        euler.set(beta, alpha, -gamma, 'YXZ');
        this.camera.quaternion.setFromEuler(euler);
        this.camera.quaternion.multiply(q1);
        this.camera.quaternion.multiply(q0.setFromAxisAngle(zee, -orient));
      }

      // Heykel animasyonları
      if (this.currentSculptureMesh && this.currentSculptureMesh.userData.animate) {
        this.currentSculptureMesh.userData.animate(delta);
      }

      this.renderer.render(this.scene, this.camera);
    };

    animate();
  }
}

window.WebAREngine = WebAREngine;
