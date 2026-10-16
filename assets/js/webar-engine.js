/**
 * Ürgüp Meydanı WebAR - Çekirdek AR Motoru (Core WebAR Engine)
 * iOS Safari, Android Chrome ve masaüstü tarayıcılarda sıfır kurulumla çalışan,
 * kamera akışı, jiroskop/sensör yönelimi, gölge düzlemi, reticle zemin tespiti
 * ve dokunmatik hareket jestleri (drag/rotate/scale) sunan WebGL AR motoru.
 */

class WebAREngine {
  constructor(options = {}) {
    this.container = options.container || document.body;
    this.videoElement = options.videoElement;
    this.onReticleStatus = options.onReticleStatus || null;
    this.onSculpturePlaced = options.onSculpturePlaced || null;

    // Three.js Bileşenleri
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = new THREE.Clock();

    // AR Durumu
    this.isPlaced = false;
    this.currentSculptureGroup = null;
    this.reticle = null;
    this.groundPlane = null;
    this.shadowPlane = null;
    this.raycaster = new THREE.Raycaster();
    this.centerScreen = new THREE.Vector2(0, 0);

    // Işıklar
    this.ambientLight = null;
    this.dirLight = null;
    this.atmosphereMode = 'daylight'; // 'daylight', 'sunset', 'night'

    // Kamera ve Jiroskop
    this.stream = null;
    this.deviceOrientation = { alpha: 0, beta: 0, gamma: 0 };
    this.hasOrientation = false;
    this.orbitControls = null;

    // Dokunmatik Jestler (Touch Gestures)
    this.touchStartDistance = 0;
    this.touchStartAngle = 0;
    this.touchStartPos = new THREE.Vector2();
    this.isDragging = false;

    this.initScene();
    this.initReticle();
    this.initShadowPlane();
    this.initLighting();
    this.setupEvents();
    this.startRenderLoop();
  }

  // 1. Üç Boyutlu Sahne ve WebGL Renderer Kurulumu
  initScene() {
    this.scene = new THREE.Scene();

    // Kamera: Geniş açı mobil perspektif
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.05, 100);
    this.camera.position.set(0, 1.6, 2.5); // Göz hizası (~1.60m)
    this.camera.lookAt(0, 0.8, 0);

    // Renderer: Şeffaf arka plan, gölge haritaları, ekran görüntüsü için preserveDrawingBuffer
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
    this.renderer.outputEncoding = THREE.sRGBEncoding;

    // Canvas stili
    const canvas = this.renderer.domElement;
    canvas.id = 'webar-canvas';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.zIndex = '2';
    canvas.style.pointerEvents = 'auto';
    this.container.appendChild(canvas);
  }

  // 2. Işıklandırma ve Atmosferler
  initLighting() {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(this.ambientLight);

    // Güneş Işığı ve Gerçekçi Gölge Kamerası
    this.dirLight = new THREE.DirectionalLight(0xfffbeb, 1.4);
    this.dirLight.position.set(5, 12, 7);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 25;
    this.dirLight.shadow.camera.left = -3;
    this.dirLight.shadow.camera.right = 3;
    this.dirLight.shadow.camera.top = 3;
    this.dirLight.shadow.camera.bottom = -3;
    this.dirLight.shadow.bias = -0.0005;
    this.scene.add(this.dirLight);
  }

  // Atmosfer Değiştirici
  setAtmosphere(mode) {
    this.atmosphereMode = mode;
    if (mode === 'daylight') {
      this.ambientLight.color.setHex(0xffffff);
      this.ambientLight.intensity = 0.75;
      this.dirLight.color.setHex(0xfffbeb);
      this.dirLight.intensity = 1.4;
      this.dirLight.position.set(5, 12, 7);
    } else if (mode === 'sunset') {
      // Kapadokya Kızıl Gün Batımı / Altın Saat
      this.ambientLight.color.setHex(0xfb923c);
      this.ambientLight.intensity = 0.5;
      this.dirLight.color.setHex(0xf97316);
      this.dirLight.intensity = 1.8;
      this.dirLight.position.set(8, 4, 6);
    } else if (mode === 'night') {
      // Mahzen & Gece UV Işıma Modu
      this.ambientLight.color.setHex(0x1e1b4b);
      this.ambientLight.intensity = 0.3;
      this.dirLight.color.setHex(0x38bdf8);
      this.dirLight.intensity = 0.6;
      this.dirLight.position.set(0, 8, -4);
    }
  }

  // 3. Gerçekçi Gölge Düzlemi (Meydan zeminine heykelin bastığı hissi)
  initShadowPlane() {
    const shadowGeo = new THREE.PlaneGeometry(16, 16);
    const shadowMat = new THREE.ShadowMaterial({
      opacity: 0.38
    });
    this.shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadowPlane.rotation.x = -Math.PI / 2;
    this.shadowPlane.position.y = 0;
    this.shadowPlane.receiveShadow = true;
    this.scene.add(this.shadowPlane);

    // Işın kesişimi için görünmez zemin
    const groundGeo = new THREE.PlaneGeometry(50, 50);
    const groundMat = new THREE.MeshBasicMaterial({ visible: false });
    this.groundPlane = new THREE.Mesh(groundGeo, groundMat);
    this.groundPlane.rotation.x = -Math.PI / 2;
    this.scene.add(this.groundPlane);
  }

  // 4. Hedefleme Halkası (AR Reticle)
  initReticle() {
    this.reticle = new THREE.Group();

    // Dış Halka
    const ringGeo = new THREE.RingGeometry(0.35, 0.38, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b, // Altın amber
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    this.reticle.add(ring);

    // İç Merkez Nokta
    const dotGeo = new THREE.CircleGeometry(0.06, 24);
    const dotMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide
    });
    const dot = new THREE.Mesh(dotGeo, dotMat);
    dot.rotation.x = -Math.PI / 2;
    this.reticle.add(dot);

    // 4 Yönlü Hedefleme Çizgileri
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const cross1 = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.02), lineMat);
    cross1.rotation.x = -Math.PI / 2;
    cross1.position.x = 0.44;
    this.reticle.add(cross1);

    const cross2 = cross1.clone();
    cross2.position.x = -0.44;
    this.reticle.add(cross2);

    const cross3 = new THREE.Mesh(new THREE.PlaneGeometry(0.02, 0.12), lineMat);
    cross3.rotation.x = -Math.PI / 2;
    cross3.position.z = 0.44;
    this.reticle.add(cross3);

    const cross4 = cross3.clone();
    cross4.position.z = -0.44;
    this.reticle.add(cross4);

    this.reticle.visible = false;
    this.scene.add(this.reticle);
  }

  // 5. Canlı Kamera Akışını Başlat
  async startCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn('getUserMedia desteklenmiyor veya HTTP üzerinden çalışıyor.');
      return false;
    }

    try {
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' }, // Arka kamera
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (this.videoElement) {
        this.videoElement.srcObject = this.stream;
        await this.videoElement.play();
        return true;
      }
    } catch (err) {
      console.warn('Arka kamera erişimi sağlanamadı, varsayılan kamera deneniyor:', err);
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (this.videoElement) {
          this.videoElement.srcObject = this.stream;
          await this.videoElement.play();
          return true;
        }
      } catch (e2) {
        console.error('Kamera erişimi tamamen reddedildi:', e2);
        return false;
      }
    }
    return false;
  }

  // 6. Jiroskop ve Oryantasyon Sensörleri
  async enableSensors() {
    // iOS 13+ izni
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const response = await DeviceOrientationEvent.requestPermission();
        if (response === 'granted') {
          window.addEventListener('deviceorientation', (e) => this.onDeviceOrientation(e), true);
          return true;
        }
      } catch (err) {
        console.warn('Sensör izni alınamadı:', err);
      }
    } else if ('ondeviceorientation' in window) {
      window.addEventListener('deviceorientation', (e) => this.onDeviceOrientation(e), true);
      return true;
    }
    return false;
  }

  onDeviceOrientation(event) {
    if (event.beta !== null && event.gamma !== null) {
      this.hasOrientation = true;
      this.deviceOrientation.alpha = event.alpha || 0;
      this.deviceOrientation.beta = event.beta || 0;
      this.deviceOrientation.gamma = event.gamma || 0;
    }
  }

  // 7. Heykeli Sahneye Yükle
  async setSculpture(sculptureMeshPromise, metadata = {}) {
    if (this.currentSculptureGroup) {
      this.scene.remove(this.currentSculptureGroup);
      this.currentSculptureGroup = null;
    }

    const meshGroup = await sculptureMeshPromise;
    this.currentSculptureGroup = meshGroup;
    this.currentSculptureMetadata = metadata;

    const scale = metadata.defaultScale || 1.0;
    this.currentSculptureGroup.scale.set(scale, scale, scale);

    // Eğer daha önce yerleştirilmediyse reticle'a göre veya kameranın 2 metre önüne koy
    if (!this.isPlaced) {
      this.currentSculptureGroup.position.set(0, 0, -2.2);
    }

    this.scene.add(this.currentSculptureGroup);
  }

  // 8. Ekrana Dokunarak / Butona Basarak Heykeli Meydana Yerleştir (Place)
  placeSculpture() {
    if (!this.currentSculptureGroup) return;

    if (this.reticle && this.reticle.visible) {
      this.currentSculptureGroup.position.copy(this.reticle.position);
      this.currentSculptureGroup.position.y += (this.currentSculptureMetadata?.yOffset || 0);
    } else {
      // Reticle görünmüyorsa kameranın önündeki zemin noktasına sabitle
      const forward = new THREE.Vector3(0, 0, -2.5).applyQuaternion(this.camera.quaternion);
      this.currentSculptureGroup.position.set(this.camera.position.x + forward.x, 0, this.camera.position.z + forward.z);
    }

    this.isPlaced = true;
    if (this.reticle) this.reticle.visible = false;

    // Yerleşme animasyonu (Hafif sıçrama / nefes)
    const originalScale = this.currentSculptureMetadata?.defaultScale || 1.0;
    this.currentSculptureGroup.scale.set(0.1, 0.1, 0.1);
    let step = 0;
    const spawnInterval = setInterval(() => {
      step += 0.1;
      const s = THREE.MathUtils.lerp(0.1, originalScale, step);
      if (this.currentSculptureGroup) {
        this.currentSculptureGroup.scale.set(s, s, s);
      }
      if (step >= 1.0) clearInterval(spawnInterval);
    }, 20);

    if (this.onSculpturePlaced) {
      this.onSculpturePlaced(this.currentSculptureGroup.position);
    }
  }

  // Yerleşimi Sıfırla (Yeniden Yerleştir Modu)
  resetPlacement() {
    this.isPlaced = false;
    if (this.reticle) this.reticle.visible = true;
  }

  // 9. Etkileşimler (Döndürme, Ölçekleme, Taşıma)
  rotateSculpture(deltaRad) {
    if (this.currentSculptureGroup) {
      this.currentSculptureGroup.rotation.y += deltaRad;
    }
  }

  scaleSculpture(multiplier) {
    if (this.currentSculptureGroup) {
      const current = this.currentSculptureGroup.scale.x;
      const next = THREE.MathUtils.clamp(current * multiplier, 0.15, 6.0);
      this.currentSculptureGroup.scale.set(next, next, next);
    }
  }

  // 10. Dokunmatik ve Fare Olayları
  setupEvents() {
    window.addEventListener('resize', () => this.onWindowResize());

    const canvas = this.renderer.domElement;

    // Dokunma Başlangıcı
    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.touchStartPos.set(e.touches[0].clientX, e.touches[0].clientY);
        this.isDragging = true;
      } else if (e.touches.length === 2) {
        // İki parmakla kıstırma (Pinch) ve çevirme (Twist)
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        this.touchStartDistance = Math.hypot(dx, dy);
        this.touchStartAngle = Math.atan2(dy, dx);
      }
    }, { passive: false });

    // Dokunma Hareketi
    canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1 && this.isDragging && this.currentSculptureGroup) {
        // Tek parmak: Heykeli meydanda hafifçe döndür
        const dx = e.touches[0].clientX - this.touchStartPos.x;
        this.rotateSculpture(dx * 0.01);
        this.touchStartPos.set(e.touches[0].clientX, e.touches[0].clientY);
      } else if (e.touches.length === 2 && this.currentSculptureGroup) {
        // İki parmak boyutu ve yönü değiştir
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx);

        if (this.touchStartDistance > 0) {
          const factor = dist / this.touchStartDistance;
          this.scaleSculpture(factor);
          this.touchStartDistance = dist;
        }

        const angleDelta = angle - this.touchStartAngle;
        this.rotateSculpture(-angleDelta);
        this.touchStartAngle = angle;
      }
    }, { passive: false });

    canvas.addEventListener('touchend', () => {
      this.isDragging = false;
      this.touchStartDistance = 0;
    });

    // Masaüstü fare sürükleme desteği
    let isMouseDown = false;
    let prevMouseX = 0;
    canvas.addEventListener('mousedown', (e) => {
      isMouseDown = true;
      prevMouseX = e.clientX;
    });
    window.addEventListener('mousemove', (e) => {
      if (isMouseDown && this.currentSculptureGroup) {
        const dx = e.clientX - prevMouseX;
        this.rotateSculpture(dx * 0.01);
        prevMouseX = e.clientX;
      }
    });
    window.addEventListener('mouseup', () => {
      isMouseDown = false;
    });
    canvas.addEventListener('wheel', (e) => {
      if (this.currentSculptureGroup) {
        const factor = e.deltaY > 0 ? 0.92 : 1.08;
        this.scaleSculpture(factor);
      }
    });
  }

  onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  // 11. Ana Render Döngüsü
  startRenderLoop() {
    const animate = () => {
      requestAnimationFrame(animate);

      const delta = this.clock.getDelta();

      // Zemin Tespiti (Reticle Raycast)
      if (!this.isPlaced && this.reticle && this.groundPlane) {
        this.raycaster.setFromCamera(this.centerScreen, this.camera);
        const intersects = this.raycaster.intersectObject(this.groundPlane);
        if (intersects.length > 0) {
          this.reticle.visible = true;
          this.reticle.position.copy(intersects[0].point);
          // Reticle döngü animasyonu
          this.reticle.rotation.y += delta * 0.8;
          if (this.onReticleStatus) this.onReticleStatus(true);
        } else {
          this.reticle.visible = false;
          if (this.onReticleStatus) this.onReticleStatus(false);
        }
      }

      // Heykel animasyonu varsa yürüt (biyo-nabız, ışık salınımı vb.)
      if (this.currentSculptureGroup && this.currentSculptureGroup.userData.animate) {
        this.currentSculptureGroup.userData.animate(delta);
      }

      // Jiroskop ile telefon hareketini kameraya yumuşak yansıt
      if (this.hasOrientation) {
        const radBeta = THREE.MathUtils.degToRad(this.deviceOrientation.beta - 45);
        const radGamma = THREE.MathUtils.degToRad(this.deviceOrientation.gamma);
        // Kamera hafif eğim eşleme
        this.camera.rotation.x = THREE.MathUtils.lerp(this.camera.rotation.x, radBeta * 0.3, 0.1);
        this.camera.rotation.z = THREE.MathUtils.lerp(this.camera.rotation.z, -radGamma * 0.3, 0.1);
      }

      this.renderer.render(this.scene, this.camera);
    };

    animate();
  }
}

window.WebAREngine = WebAREngine;
