/**
 * Ürgüp Meydanı WebAR - Heykel Kütüphanesi & 3D Model Motoru
 * Mobil WebGL (iOS Safari & Android Chrome) ile %100 uyumlu,
 * hafif, sıfır shader çökmesi garantili prosedürel ve GLB heykeller.
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
        defaultScale: 1.0,
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
        defaultScale: 1.1,
        yOffset: 0.0,
        type: 'procedural',
        createMesh: () => this.createMonolithSculpture()
      }
    ];
  }

  getAll() {
    return this.catalog;
  }

  getById(id) {
    return this.catalog.find(s => s.id === id) || this.catalog[0];
  }

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

  // 1. ÜRGÜP KİMERASI
  createChimeraSculpture() {
    const group = new THREE.Group();
    group.name = 'sculpture_chimera';

    // Kaide
    const baseGeo = new THREE.CylinderGeometry(0.75, 0.9, 0.22, 32);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.35,
      metalness: 0.7
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = 0.11;
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    group.add(baseMesh);

    // Pirinç Yazıt Levhası
    const plaqueGeo = new THREE.BoxGeometry(0.48, 0.08, 0.02);
    const plaqueMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.25,
      metalness: 0.9
    });
    const plaque = new THREE.Mesh(plaqueGeo, plaqueMat);
    plaque.position.set(0, 0.11, 0.82);
    group.add(plaque);

    // Ana Heykel Gövdesi (Mobil uyumlu yarı saydam reçine)
    const bodyGeo = new THREE.TorusKnotGeometry(0.52, 0.15, 96, 24, 2, 3);
    const resinMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      emissive: 0x0284c7,
      emissiveIntensity: 0.25,
      roughness: 0.2,
      metalness: 0.1,
      transparent: true,
      opacity: 0.92
    });
    const bodyMesh = new THREE.Mesh(bodyGeo, resinMat);
    bodyMesh.position.y = 1.05;
    bodyMesh.rotation.x = Math.PI * 0.1;
    bodyMesh.castShadow = true;
    group.add(bodyMesh);

    // İç Çekirdek (Biyo-Nabız)
    const coreGeo = new THREE.IcosahedronGeometry(0.22, 2);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreMesh.position.y = 1.05;
    group.add(coreMesh);

    // Çevreleyen Altın Halka Lifleri
    for (let i = 0; i < 3; i++) {
      const ringGeo = new THREE.TorusGeometry(0.68 + i * 0.07, 0.015, 12, 48);
      const ringMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        metalness: 0.9,
        roughness: 0.25
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.y = 0.75 + i * 0.25;
      ring.rotation.x = Math.PI * 0.35 + i * 0.25;
      ring.rotation.y = i * 0.6;
      ring.castShadow = true;
      group.add(ring);
    }

    // İç Işık
    const innerLight = new THREE.PointLight(0x38bdf8, 1.2, 3.5);
    innerLight.position.y = 1.05;
    group.add(innerLight);

    group.userData.animate = (delta) => {
      bodyMesh.rotation.y += delta * 0.25;
      coreMesh.rotation.y -= delta * 0.45;
      const pulse = 1 + Math.sin(Date.now() * 0.004) * 0.15;
      coreMesh.scale.set(pulse, pulse, pulse);
    };

    return Promise.resolve(group);
  }

  // 2. KAPADOKYA ASİL ATI
  createSteedSculpture() {
    const group = new THREE.Group();
    group.name = 'sculpture_steed';

    // Kaide
    const baseGeo = new THREE.BoxGeometry(1.5, 0.25, 0.85);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x57534e,
      roughness: 0.8,
      metalness: 0.15
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.125;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    const bronzeMat = new THREE.MeshStandardMaterial({
      color: 0x92400e,
      roughness: 0.38,
      metalness: 0.85
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.25,
      metalness: 0.95
    });

    // Gövde
    const torsoGeo = new THREE.CylinderGeometry(0.28, 0.35, 0.9, 7);
    const torso = new THREE.Mesh(torsoGeo, bronzeMat);
    torso.rotation.z = Math.PI * 0.45;
    torso.position.set(0, 0.9, 0);
    torso.castShadow = true;
    group.add(torso);

    // Boyun
    const neckGeo = new THREE.CylinderGeometry(0.16, 0.26, 0.7, 6);
    const neck = new THREE.Mesh(neckGeo, bronzeMat);
    neck.position.set(0.38, 1.35, 0);
    neck.rotation.z = -Math.PI * 0.22;
    neck.castShadow = true;
    group.add(neck);

    // Baş
    const headGeo = new THREE.ConeGeometry(0.18, 0.5, 6);
    const head = new THREE.Mesh(headGeo, goldMat);
    head.position.set(0.65, 1.58, 0);
    head.rotation.z = -Math.PI * 0.65;
    head.castShadow = true;
    group.add(head);

    // Kulaklar
    const ear1 = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 4), goldMat);
    ear1.position.set(0.52, 1.78, 0.07);
    group.add(ear1);
    const ear2 = ear1.clone();
    ear2.position.z = -0.07;
    group.add(ear2);

    // 4 Bacak
    const legPositions = [
      [0.4, 0.45, 0.22],
      [0.4, 0.45, -0.22],
      [-0.4, 0.45, 0.22],
      [-0.4, 0.45, -0.22]
    ];
    legPositions.forEach(pos => {
      const legGeo = new THREE.CylinderGeometry(0.07, 0.05, 0.7, 6);
      const leg = new THREE.Mesh(legGeo, bronzeMat);
      leg.position.set(pos[0], pos[1], pos[2]);
      leg.castShadow = true;
      group.add(leg);
    });

    group.userData.animate = (delta) => {
      group.rotation.y += delta * 0.15;
    };

    return Promise.resolve(group);
  }

  // 3. GıLAMA ASMA KÖKÜ
  createVineSculpture() {
    const group = new THREE.Group();
    group.name = 'sculpture_vine';

    const baseGeo = new THREE.CylinderGeometry(0.7, 0.8, 0.25, 12);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.85,
      metalness: 0.2
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.125;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x451a03,
      roughness: 0.85,
      metalness: 0.08
    });

    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const curvePoints = [];
      for (let j = 0; j <= 6; j++) {
        const t = j / 6;
        const rad = (1 - t * 0.5) * 0.4;
        const x = Math.cos(angle + t * 2.2) * rad;
        const z = Math.sin(angle + t * 2.2) * rad;
        const y = t * 1.6 + 0.2;
        curvePoints.push(new THREE.Vector3(x, y, z));
      }
      const path = new THREE.CatmullRomCurve3(curvePoints);
      const tubeGeo = new THREE.TubeGeometry(path, 32, 0.07, 8, false);
      const tube = new THREE.Mesh(tubeGeo, woodMat);
      tube.castShadow = true;
      group.add(tube);
    }

    // Kehribar Işıklı Kalp
    const heartGeo = new THREE.OctahedronGeometry(0.3, 1);
    const heartMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.8,
      roughness: 0.2,
      metalness: 0.3
    });
    const heart = new THREE.Mesh(heartGeo, heartMat);
    heart.position.set(0, 1.05, 0);
    group.add(heart);

    const heartLight = new THREE.PointLight(0xf59e0b, 1.4, 4);
    heartLight.position.set(0, 1.05, 0);
    group.add(heartLight);

    group.userData.animate = (delta) => {
      const pulse = 1 + Math.sin(Date.now() * 0.005) * 0.16;
      heart.scale.set(pulse, pulse, pulse);
      heart.rotation.y += delta * 0.35;
      group.rotation.y += delta * 0.1;
    };

    return Promise.resolve(group);
  }

  // 4. PERİ BACASI KRİSTAL MONOLİTİ
  createMonolithSculpture() {
    const group = new THREE.Group();
    group.name = 'sculpture_monolith';

    const baseGeo = new THREE.CylinderGeometry(0.75, 0.9, 0.25, 8);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.8,
      metalness: 0.2
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.125;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    const tufaMat = new THREE.MeshStandardMaterial({
      color: 0xa8a29e,
      roughness: 0.92,
      metalness: 0.05
    });

    const bodyGeo = new THREE.CylinderGeometry(0.25, 0.45, 1.8, 8);
    const body = new THREE.Mesh(bodyGeo, tufaMat);
    body.position.set(0, 1.1, 0);
    body.castShadow = true;
    group.add(body);

    const capGeo = new THREE.ConeGeometry(0.5, 0.35, 7);
    const capMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.75,
      metalness: 0.2
    });
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.set(0, 2.1, 0);
    cap.castShadow = true;
    group.add(cap);

    // Mor Kristal Ametist Detayı
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0x9333ea,
      emissive: 0x7e22ce,
      emissiveIntensity: 0.7,
      roughness: 0.2,
      metalness: 0.3
    });
    for (let i = 0; i < 8; i++) {
      const cMesh = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.3, 5), crystalMat);
      const ang = (i / 8) * Math.PI * 2;
      cMesh.position.set(Math.cos(ang) * 0.26, 0.7 + (i % 3) * 0.3, Math.sin(ang) * 0.26);
      cMesh.rotation.set(0.4, ang, 0.2);
      group.add(cMesh);
    }

    group.userData.animate = (delta) => {
      group.rotation.y += delta * 0.12;
    };

    return Promise.resolve(group);
  }

  // 5. GLB MODEL YÜKLEYİCİ
  loadGLBModel(source) {
    return new Promise((resolve, reject) => {
      const onLoad = (gltf) => {
        const root = gltf.scene || gltf.scenes[0];
        root.name = 'sculpture_custom_glb';

        const box = new THREE.Box3().setFromObject(root);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        const maxDim = Math.max(size.x, size.y, size.z);
        const targetScale = 1.4 / (maxDim || 1);
        root.scale.setScalar(targetScale);

        root.position.x = -center.x * targetScale;
        root.position.z = -center.z * targetScale;
        root.position.y = -box.min.y * targetScale;

        root.traverse((node) => {
          if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
          }
        });

        const wrapper = new THREE.Group();
        wrapper.add(root);
        wrapper.userData.animate = (delta) => {
          wrapper.rotation.y += delta * 0.15;
        };
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
