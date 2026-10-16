/**
 * Ürgüp Meydanı WebAR - Host & Küratör Yönetici Paneli Motoru
 * Sergideki heykelleri yönetir, yeni GLB modelleri ekler,
 * 3D önizleme sunar ve baskıya hazır QR kodlar üretir.
 */

class HostAdminStudio {
  constructor(sculptureLib) {
    this.library = sculptureLib;
    this.previewRenderer = null;
    this.previewScene = null;
    this.previewCamera = null;
    this.previewControls = null;
    this.previewMeshGroup = null;
    this.activeSculptureId = 'chimera';

    this.initLocalStorage();
  }

  // Tarayıcı belleğinden veya varsayılan katalogdan yükle
  initLocalStorage() {
    const saved = localStorage.getItem('urgup_custom_sculptures');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        parsed.forEach(item => {
          // Özel eklenen heykelleri kütüphaneye dahil et
          this.library.addCustomModel(item);
        });
      } catch (e) {
        console.error('Kayıtlı modeller yüklenemedi:', e);
      }
    }
  }

  saveToLocalStorage() {
    const customOnly = this.library.catalog.filter(s => s.type === 'glb');
    localStorage.setItem('urgup_custom_sculptures', JSON.stringify(customOnly));
  }

  // 3D Önizleme Sahnesini Başlat (Admin Paneli içi)
  initPreviewViewport(canvasElement) {
    if (!canvasElement) return;

    const width = canvasElement.clientWidth || 400;
    const height = canvasElement.clientHeight || 300;

    this.previewScene = new THREE.Scene();
    this.previewScene.background = new THREE.Color(0x0f172a); // Koyu lacivert/obsidyen zemin

    this.previewCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 50);
    this.previewCamera.position.set(0, 1.8, 3.2);

    this.previewRenderer = new THREE.WebGLRenderer({
      canvas: canvasElement,
      antialias: true,
      preserveDrawingBuffer: true
    });
    this.previewRenderer.setSize(width, height);
    this.previewRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.previewRenderer.shadowMap.enabled = true;

    // Işıklar
    const amb = new THREE.AmbientLight(0xffffff, 0.7);
    this.previewScene.add(amb);

    const dir = new THREE.DirectionalLight(0xfffbeb, 1.4);
    dir.position.set(4, 8, 4);
    dir.castShadow = true;
    this.previewScene.add(dir);

    // Kılavuz Zemin Izgarası (Meydan parke taşı ölçeği)
    const grid = new THREE.GridHelper(6, 12, 0xd97706, 0x334155);
    grid.position.y = 0;
    this.previewScene.add(grid);

    // Orbit Controls (Eğer varsa veya elle döndürme)
    if (typeof THREE.OrbitControls !== 'undefined') {
      this.previewControls = new THREE.OrbitControls(this.previewCamera, canvasElement);
      this.previewControls.enableDamping = true;
      this.previewControls.dampingFactor = 0.05;
      this.previewControls.target.set(0, 0.8, 0);
    }

    // Render Döngüsü
    const animate = () => {
      requestAnimationFrame(animate);
      if (this.previewControls) this.previewControls.update();
      if (this.previewMeshGroup && this.previewMeshGroup.userData.animate) {
        this.previewMeshGroup.userData.animate(0.016);
      }
      this.previewRenderer.render(this.previewScene, this.previewCamera);
    };
    animate();

    // İlk heykeli yükle
    this.loadPreviewSculpture(this.activeSculptureId);
  }

  // Önizlemeye heykel yükle
  async loadPreviewSculpture(id) {
    this.activeSculptureId = id;
    const item = this.library.getById(id);
    if (!item) return;

    if (this.previewMeshGroup) {
      this.previewScene.remove(this.previewMeshGroup);
      this.previewMeshGroup = null;
    }

    try {
      const mesh = await item.createMesh();
      this.previewMeshGroup = mesh;
      const scale = item.defaultScale || 1.0;
      this.previewMeshGroup.scale.set(scale, scale, scale);
      this.previewScene.add(this.previewMeshGroup);
    } catch (e) {
      console.error('Önizleme yüklenemedi:', e);
    }
  }

  // Yeni 3D Dosya Yükleme (GLB/GLTF dosyasını arrayBuffer'a çevirip ekleme)
  async handleFileUpload(file, metadata) {
    return new Promise((resolve, reject) => {
      if (!file.name.match(/\.(glb|gltf)$/i)) {
        reject(new Error('Lütfen sadece .glb veya .gltf 3D model dosyası seçin.'));
        return;
      }

      const reader = new FileReader();
      reader.onload = async (e) => {
        const buffer = e.target.result;
        const newEntry = this.library.addCustomModel({
          name: metadata.name || file.name.replace(/\.[^/.]+$/, ''),
          nameEN: metadata.nameEN || file.name.replace(/\.[^/.]+$/, ''),
          artist: metadata.artist || 'Meydan Misafir Sanatçısı',
          description: metadata.description || 'Host tarafından eklenen 3D heykel yerleştirmesi.',
          descriptionEN: metadata.descriptionEN || '3D sculpture installed by exhibition host.',
          scale: metadata.scale || 1.0,
          yOffset: metadata.yOffset || 0.0,
          buffer: buffer
        });

        // Önizlemeyi güncelle
        await this.loadPreviewSculpture(newEntry.id);
        resolve(newEntry);
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  // QR Kod Üretimi & İndirme
  async generateQRCode(options = {}) {
    const baseUrl = options.url || window.location.origin + window.location.pathname.replace('admin.html', 'index.html');
    const targetUrl = options.sculptureId && options.sculptureId !== 'all'
      ? `${baseUrl}?sculpture=${encodeURIComponent(options.sculptureId)}`
      : baseUrl;

    const qrResult = await QRCodeGenerator.generate(targetUrl, {
      size: options.size || 512,
      colorDark: options.colorDark || '#0f172a',
      colorLight: options.colorLight || '#ffffff',
      title: options.title || 'ÜRGÜP MEYDANI HEYKELİ',
      subtitle: options.subtitle || 'Kameranızı Doğrultup Deneyimleyin'
    });

    return {
      ...qrResult,
      targetUrl
    };
  }

  // Sergi Konfigürasyonunu JSON Olarak Dışa Aktar
  exportConfigJSON() {
    const config = {
      title: 'Ürgüp Meydanı Açık Hava Dijital Heykel Sergisi',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      sculptures: this.library.catalog.map(s => ({
        id: s.id,
        name: s.name,
        nameEN: s.nameEN,
        artist: s.artist,
        category: s.category,
        description: s.description,
        descriptionEN: s.descriptionEN,
        defaultScale: s.defaultScale,
        yOffset: s.yOffset,
        type: s.type
      }))
    };

    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `urgup-meydan-sergi-ayarlari-${Date.now()}.json`;
    a.click();
  }
}

window.HostAdminStudio = HostAdminStudio;
