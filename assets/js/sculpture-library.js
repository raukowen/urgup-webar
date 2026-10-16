/**
 * Ürgüp Meydanı WebAR - Heykel Kütüphanesi & 3D Model Motoru
 * Hem harici .glb/.gltf dosyalarını hem de yerleşik yüksek kaliteli
 * parametrik/prosedürel Ürgüp heykellerini yönetir.
 */

class SculptureLibrary {
  constructor() {
    this.gltfLoader = new THREE.GLTFLoader();
    this.catalog = [
      {
        id: 'chimera',
        name: 'Ürgüp Kimerası (The Chimera)',
        nameEN: 'The Chimera of Urgup',
        artist: 'Ra & Bilgesu Studio',
        category: 'Melez Biyo-Fosil',
        description: 'Asırlık asma kökleri, süt beyazı yarı saydam reçine ve organik fosil dokunun melezleştiği çağdaş anıt heykel. Ürgüp volkanik toprağının kadim ruhunu temsil eder.',
        descriptionEN: 'A contemporary monument fusing centenarian vine roots, frosted alabaster resin, and organic fossil textures. Symbolizes the primordial volcanic spirit of Urgup.',
        defaultScale: 1.0,
        yOffset: 0.0,
        type: 'procedural',
        createMesh: () => this.createChimeraSculpture()
      },
      {
        id: 'steed',
        name: 'Kapadokya Asil Atı',
        nameEN: 'Sacred Steed of Cappadocia',
        artist: 'Kapadokya Çağdaş Heykel İnisiyatifi',
        category: 'Antik Bronz & Altın',
        description: 'Pers dilinde "Katpatuka - Güzel Atlar Ülkesi" anlamına gelen Kapadokya’nın efsanevi atlarına adanmış fütüristik, poligonel bronz ve altın patineli heykel.',
        descriptionEN: 'Dedicated to Cappadocia\'s ancient namesake "Land of Beautiful Horses". A futuristic polygonal bronze statue crowned with polished gold leaf accents.',
        defaultScale: 0.9,
        yOffset: 0.0,
        type: 'procedural',
        createMesh: () => this.createSteedSculpture()
      },
      {
        id: 'gilama_vine',
        name: 'GıLAMA Asma Kökü & Biyo-Işık',
        nameEN: 'GıLAMA Ancient Vine & Bio-Pulse',
        artist: 'GıLAMA Art Group',
        category: 'Işıklı Kinetik Heykel',
        description: 'Ürgüp bağlarından çıkarılan 120 yıllık asma kütüğü, içten aydınlatmalı biyo-ışık damarları ve optik kristallerle yaşayan bir organik forma dönüştürülmüştür.',
        descriptionEN: 'A 120-year-old vine root from Urgup vineyards, pulsing with inner bioluminescent LED fibers and amber crystal veins.',
        defaultScale: 1.1,
        yOffset: 0.0,
        type: 'procedural',
        createMesh: () => this.createVineSculpture()
      },
      {
        id: 'monolith',
        name: 'Peri Bacası Kristal Monoliti',
        nameEN: 'Fairy Chimney Crystal Monolith',
        artist: 'Hamleci Taş Atölyesi & Ra',
        category: 'Volkanik Tüf & Ametist',
        description: 'Milyonlarca yıllık Ürgüp volkanik tüf taşının içinden fışkıran devasa mor ametist ve kuvars kristal jeotunu betimleyen anıtsal meydan monoliti.',
        descriptionEN: 'A monumental plaza obelisk carved from ancient volcanic tuff, cleaved open to reveal radiant amethyst and quartz geode crystals.',
        defaultScale: 1.2,
        yOffset: 0.0,
        type: 'procedural',
        createMesh: () => this.createMonolithSculpture()
      }
    ];
  }

  // Tüm heykeller listesi
  getAll() {
    return this.catalog;
  }

  // ID'ye göre bul
  getById(id) {
    return this.catalog.find(s => s.id === id) || this.catalog[0];
  }

  // Yeni özel model ekle (Host panelinden)
  addCustomModel(modelData) {
    const customEntry = {
      id: 'custom_' + Date.now(),
      name: modelData.name || 'Özel 3D Heykel',
      nameEN: modelData.nameEN || 'Custom Sculpture',
      artist: modelData.artist || 'Misafir Sanatçı',
      category: 'Özel Yükleme (GLB)',
      description: modelData.description || 'Host tarafından yüklenen 3D model.',
      descriptionEN: modelData.descriptionEN || 'Custom 3D model uploaded by host.',
      defaultScale: parseFloat(modelData.scale) || 1.0,
      yOffset: parseFloat(modelData.yOffset) || 0.0,
      type: 'glb',
      glbUrl: modelData.url,
      glbBuffer: modelData.buffer,
      createMesh: () => this.loadGLBModel(modelData.buffer || modelData.url)
    };
    this.catalog.push(customEntry);
    return customEntry;
  }

  // 1. ÜRGÜP KİMERASI HEYKELİ (Translucent Alabaster / Frosted Resin / Bioluminescent core)
  createChimeraSculpture() {
    const group = new THREE.Group();
    group.name = 'sculpture_chimera';

    // 1. Kaide (Siyah Bazalt Mermer)
    const baseGeo = new THREE.CylinderGeometry(0.8, 0.95, 0.25, 32);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.3,
      metalness: 0.8
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = 0.125;
    baseMesh.receiveShadow = true;
    baseMesh.castShadow = true;
    group.add(baseMesh);

    // Kaide Pirinç Levhası (Yazıt)
    const plaqueGeo = new THREE.BoxGeometry(0.5, 0.08, 0.02);
    const plaqueMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.2,
      metalness: 0.9
    });
    const plaque = new THREE.Mesh(plaqueGeo, plaqueMat);
    plaque.position.set(0, 0.13, 0.88);
    group.add(plaque);

    // 2. Ana Gövde: Kıvrımlı Organik Melez Form (Toroidal Helix Sculpture)
    const bodyGeo = new THREE.TorusKnotGeometry(0.55, 0.16, 128, 32, 2, 3);
    const resinMat = new THREE.MeshPhysicalMaterial({
      color: 0xf8fafc,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.18,
      roughness: 0.15,
      metalness: 0.05,
      transmission: 0.75, // Yarı saydam reçine
      thickness: 1.8,
      ior: 1.48,
      transparent: true,
      opacity: 0.95
    });
    const bodyMesh = new THREE.Mesh(bodyGeo, resinMat);
    bodyMesh.position.y = 1.15;
    bodyMesh.rotation.x = Math.PI * 0.1;
    bodyMesh.castShadow = true;
    group.add(bodyMesh);

    // 3. İç Çekirdek (Organik Biyo-Işık Kalbi)
    const coreGeo = new THREE.IcosahedronGeometry(0.24, 3);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      emissive: 0x38bdf8,
      emissiveIntensity: 1.5,
      wireframe: true
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreMesh.position.y = 1.15;
    group.add(coreMesh);

    // 4. Heykeli saran altın dal lifleri
    const ringsCount = 4;
    for (let i = 0; i < ringsCount; i++) {
      const ringGeo = new THREE.TorusGeometry(0.68 + i * 0.06, 0.015, 16, 64);
      const ringMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        metalness: 0.95,
        roughness: 0.2
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.y = 0.8 + i * 0.22;
      ring.rotation.x = Math.PI * 0.35 + i * 0.2;
      ring.rotation.y = i * 0.4;
      ring.castShadow = true;
      group.add(ring);
    }

    // Heykele ait iç ışık kaynağı (Geceleri meydanı aydınlatır)
    const innerLight = new THREE.PointLight(0x38bdf8, 1.2, 3.5);
    innerLight.position.y = 1.15;
    group.add(innerLight);

    // Canlandırma referansı (Dönme veya nabız)
    group.userData.animate = (delta) => {
      bodyMesh.rotation.y += delta * 0.2;
      coreMesh.rotation.y -= delta * 0.4;
      coreMesh.rotation.x += delta * 0.2;
      const pulse = 1 + Math.sin(Date.now() * 0.003) * 0.15;
      coreMesh.scale.set(pulse, pulse, pulse);
    };

    return Promise.resolve(group);
  }

  // 2. KAPADOKYA ASİL ATI (Faceted Geometric Bronze Steed)
  createSteedSculpture() {
    const group = new THREE.Group();
    group.name = 'sculpture_steed';

    // 1. Kaide (Kapadokya Tüf Taşı)
    const baseGeo = new THREE.BoxGeometry(1.6, 0.3, 0.9);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x78716c,
      roughness: 0.85,
      metalness: 0.1
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.15;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    // 2. Heykel Malzemesi (Oksitlenmiş Antik Bronz ve Altın Detaylar)
    const bronzeMat = new THREE.MeshStandardMaterial({
      color: 0x854d0e,
      roughness: 0.35,
      metalness: 0.88
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.2,
      metalness: 0.95
    });

    // Gövde (Poligonel Doku)
    const torsoGeo = new THREE.CylinderGeometry(0.3, 0.38, 0.95, 7);
    const torso = new THREE.Mesh(torsoGeo, bronzeMat);
    torso.rotation.z = Math.PI * 0.45;
    torso.position.set(0, 0.95, 0);
    torso.castShadow = true;
    group.add(torso);

    // Boyun ve Yele
    const neckGeo = new THREE.CylinderGeometry(0.18, 0.28, 0.75, 6);
    const neck = new THREE.Mesh(neckGeo, bronzeMat);
    neck.position.set(0.42, 1.45, 0);
    neck.rotation.z = -Math.PI * 0.22;
    neck.castShadow = true;
    group.add(neck);

    // Baş (Asil At Kafası)
    const headGeo = new THREE.ConeGeometry(0.2, 0.55, 6);
    const head = new THREE.Mesh(headGeo, goldMat);
    head.position.set(0.72, 1.68, 0);
    head.rotation.z = -Math.PI * 0.65;
    head.castShadow = true;
    group.add(head);

    // Kulaklar
    const ear1 = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 4), goldMat);
    ear1.position.set(0.58, 1.9, 0.08);
    ear1.rotation.z = -0.3;
    group.add(ear1);
    const ear2 = ear1.clone();
    ear2.position.z = -0.08;
    group.add(ear2);

    // 4 Bacak (Güçlü geometrik sütunlar)
    const legPositions = [
      [0.45, 0.5, 0.25],
      [0.45, 0.5, -0.25],
      [-0.45, 0.5, 0.25],
      [-0.45, 0.5, -0.25]
    ];
    legPositions.forEach(pos => {
      const legGeo = new THREE.CylinderGeometry(0.08, 0.06, 0.75, 6);
      const leg = new THREE.Mesh(legGeo, bronzeMat);
      leg.position.set(pos[0], pos[1], pos[2]);
      leg.castShadow = true;
      group.add(leg);
    });

    // Yele Kanatları / Dinamik Vurgu
    const maneGeo = new THREE.TorusGeometry(0.4, 0.05, 8, 24, Math.PI);
    const mane = new THREE.Mesh(maneGeo, goldMat);
    mane.position.set(0.25, 1.5, 0);
    mane.rotation.z = Math.PI * 0.75;
    group.add(mane);

    group.userData.animate = (delta) => {
      // Heykel kaidesinde mikro ışıma efekti
      goldMat.roughness = 0.2 + Math.sin(Date.now() * 0.002) * 0.05;
    };

    return Promise.resolve(group);
  }

  // 3. GıLAMA ASMA KÖKÜ VE BİYO-IŞIK HEYKELİ
  createVineSculpture() {
    const group = new THREE.Group();
    group.name = 'sculpture_vine';

    // Kaide (Doğal volkanik tüf bloğu)
    const baseGeo = new THREE.DodecahedronGeometry(0.7, 1);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.9,
      metalness: 0.1
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.scale.set(1.2, 0.35, 1.2);
    base.position.y = 0.18;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    // Asma Kökü Dokulu Ağaç Malzemesi
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x3f2e21,
      roughness: 0.85,
      metalness: 0.05
    });

    // Kıvrılarak yükselen 3 asma kökü kolu
    const armsCount = 5;
    const branches = [];
    for (let i = 0; i < armsCount; i++) {
      const angle = (i / armsCount) * Math.PI * 2;
      const curvePoints = [];
      const height = 1.8;
      for (let j = 0; j <= 8; j++) {
        const t = j / 8;
        const rad = (1 - t * 0.6) * 0.45;
        const x = Math.cos(angle + t * 2.5) * rad;
        const z = Math.sin(angle + t * 2.5) * rad;
        const y = t * height + 0.25;
        curvePoints.push(new THREE.Vector3(x, y, z));
      }
      const path = new THREE.CatmullRomCurve3(curvePoints);
      const tubeGeo = new THREE.TubeGeometry(path, 40, 0.08 * (1 - i * 0.1), 10, false);
      const tube = new THREE.Mesh(tubeGeo, woodMat);
      tube.castShadow = true;
      group.add(tube);
      branches.push(tube);
    }

    // Ortada asılı Biyo-Nabız Damarı (GıLAMA Reçine Kutsal Kalp)
    const heartGeo = new THREE.OctahedronGeometry(0.32, 2);
    const heartMat = new THREE.MeshPhysicalMaterial({
      color: 0xd97706, // Kehribar (Amber)
      emissive: 0xf59e0b,
      emissiveIntensity: 1.2,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.85,
      thickness: 1.5,
      transparent: true
    });
    const heart = new THREE.Mesh(heartGeo, heartMat);
    heart.position.set(0, 1.15, 0);
    group.add(heart);

    // Işık kaynağı
    const glowLight = new THREE.PointLight(0xf59e0b, 1.5, 4);
    glowLight.position.set(0, 1.15, 0);
    group.add(glowLight);

    group.userData.animate = (delta) => {
      const pulse = 1 + Math.sin(Date.now() * 0.004) * 0.18;
      heart.scale.set(pulse, pulse, pulse);
      heart.rotation.y += delta * 0.3;
      glowLight.intensity = 1.2 + Math.sin(Date.now() * 0.005) * 0.6;
    };

    return Promise.resolve(group);
  }

  // 4. PERİ BACASI KRİSTAL MONOLİTİ
  createMonolithSculpture() {
    const group = new THREE.Group();
    group.name = 'sculpture_monolith';

    // Bazalt Kaide
    const baseGeo = new THREE.CylinderGeometry(0.85, 1.0, 0.3, 8);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.8,
      metalness: 0.2
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.15;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    // Tüf Taşı Sol ve Sağ Kabuk (Ortadan ikiye yarılmış kanyon)
    const tufaMat = new THREE.MeshStandardMaterial({
      color: 0xa8a29e, // Peri bacası tüf beji
      roughness: 0.95,
      metalness: 0.05
    });

    const leftShellGeo = new THREE.CylinderGeometry(0.2, 0.45, 2.0, 8, 1, false, 0, Math.PI * 0.85);
    const leftShell = new THREE.Mesh(leftShellGeo, tufaMat);
    leftShell.position.set(-0.1, 1.2, 0);
    leftShell.castShadow = true;
    group.add(leftShell);

    const rightShellGeo = new THREE.CylinderGeometry(0.2, 0.45, 2.0, 8, 1, false, Math.PI * 1.15, Math.PI * 0.85);
    const rightShell = new THREE.Mesh(rightShellGeo, tufaMat);
    rightShell.position.set(0.1, 1.2, 0);
    rightShell.castShadow = true;
    group.add(rightShell);

    // Üstte Şapka Taşı (Tipik Ürgüp Peri Bacası Bazalt Bloğu)
    const capGeo = new THREE.ConeGeometry(0.55, 0.4, 7);
    const capMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.7,
      metalness: 0.3
    });
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.set(0, 2.3, 0);
    cap.castShadow = true;
    group.add(cap);

    // İçte Parlayan Ametist Kristal Grubu
    const crystalMat = new THREE.MeshPhysicalMaterial({
      color: 0x9333ea, // Mor Ametist
      emissive: 0xc084fc,
      emissiveIntensity: 0.9,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.6,
      transparent: true
    });

    const crystals = new THREE.Group();
    for (let i = 0; i < 18; i++) {
      const cGeo = new THREE.ConeGeometry(0.06 + Math.random() * 0.04, 0.35 + Math.random() * 0.25, 5);
      const cMesh = new THREE.Mesh(cGeo, crystalMat);
      cMesh.position.set(
        (Math.random() - 0.5) * 0.18,
        0.5 + Math.random() * 1.3,
        (Math.random() - 0.5) * 0.18
      );
      cMesh.rotation.set(
        (Math.random() - 0.5) * 0.8,
        Math.random() * Math.PI * 2,
        (Math.random() - 0.5) * 0.8
      );
      cMesh.castShadow = true;
      crystals.add(cMesh);
    }
    group.add(crystals);

    const crystalLight = new THREE.PointLight(0xc084fc, 1.6, 3.5);
    crystalLight.position.set(0, 1.3, 0);
    group.add(crystalLight);

    group.userData.animate = (delta) => {
      crystalLight.intensity = 1.4 + Math.sin(Date.now() * 0.003) * 0.4;
    };

    return Promise.resolve(group);
  }

  // 5. HARİCİ GLB/GLTF MODEL YÜKLEYİCİ
  loadGLBModel(source) {
    return new Promise((resolve, reject) => {
      const onLoad = (gltf) => {
        const root = gltf.scene || gltf.scenes[0];
        root.name = 'sculpture_custom_glb';

        // Bounding box hesaplayıp 1.5 metre boyuta normalize et
        const box = new THREE.Box3().setFromObject(root);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        const maxDim = Math.max(size.x, size.y, size.z);
        const targetScale = 1.5 / (maxDim || 1);
        root.scale.setScalar(targetScale);

        // Zemine oturt (alt taban y=0 olacak)
        root.position.x = -center.x * targetScale;
        root.position.z = -center.z * targetScale;
        root.position.y = -box.min.y * targetScale;

        // Gölge ve materyal optimizasyonu
        root.traverse((node) => {
          if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
          }
        });

        const wrapper = new THREE.Group();
        wrapper.add(root);
        resolve(wrapper);
      };

      if (typeof source === 'string') {
        this.gltfLoader.load(source, onLoad, undefined, reject);
      } else if (source instanceof ArrayBuffer) {
        this.gltfLoader.parse(source, '', onLoad, reject);
      } else {
        reject(new Error('Geçersiz GLB veri kaynağı.'));
      }
    });
  }
}

window.SculptureLibrary = SculptureLibrary;
