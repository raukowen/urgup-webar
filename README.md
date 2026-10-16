# 🏛️ Ürgüp Meydanı Açık Hava Dijital Heykel WebAR Platformu
> **Kapadokya / Ürgüp Meydanı Turistleri İçin Sıfır Kurulumlu (No-App) Tarayıcı Tabanlı Artırılmış Gerçeklik (WebAR) Sergisi**

Bu proje, Ürgüp Meydanı'nı ziyaret eden yerli ve yabancı turistlerin, fiziksel kaidelerde veya meydan tabelalarındaki **QR kodları telefonlarıyla okutarak hiçbir uygulama (App Store / Play Store) indirmeden** doğrudan mobil tarayıcılarında (Safari, Chrome vb.) 3D çağdaş heykelleri meydan zeminine yerleştirip deneyimlemelerini, etraflarında dolaşabilmelerini, **anı fotoğrafı ve video kaydı çekebilmelerini** sağlayan gelişmiş bir WebAR platformudur.

---

## ⚡ Temel Özellikler

### 📱 1. Turist Deneyimi (`index.html`)
- **Uygulama İndirme Yok:** Safari (iOS) ve Chrome (Android) dahil tüm mobil tarayıcılarda tek tıkla açılır.
- **Canlı Kamera & Zemin Algılama (AR Reticle):** Telefon meydana doğrultulduğunda zemin düzlemi algılanır; dokunulan noktaya heykel gerçekçi gölgelerle (`Shadow Receiver Plane`) yerleşir.
- **Tam 3D Etkileşim:**
  - 1 Parmak: Heykeli meydanda döndürme.
  - 2 Parmak (Pinch & Twist): Heykeli küçültme / anıtsal devasa boyuta çıkarma ve yönünü çevirme.
  - Sürükleme: Heykeli meydanda ileri-geri taşıma.
- **📸 Yüksek Çözünürlüklü Fotoğraf Çekimi:**
  - Canlı kamera görüntüsü ile 3D heykeli pürüzsüzce birleştirir (Composite Canvas).
  - Fotoğrafın altına zarif **"📍 Ürgüp Meydanı Açık Hava Dijital Sergisi"** rozeti ve heykel adı filigran olarak işlenir.
  - Doğrudan cihaza kaydetme veya Instagram/WhatsApp üzerinden paylaşma (Web Share API).
- **🎥 Canlı AR Video Kaydı:**
  - Heykel meydandayken turistlerin anı videosu çekebilmesi için dahili `MediaRecorder` video motoru.
  - Canlı kayıt sayacı (`REC 00:08`) ve anında `.webm` / `.mp4` video indirme.
- **🔊 Sesli Rehber & Çoklu Dil (TR / EN):**
  - Turistler için iki dilli arayüz.
  - Heykelin felsefi ve tarihi hikayesini seslendiren dahili ses motoru (Web Speech API + 528Hz Kapadokya meditasyon çanı).
- **☀️ Işık & Atmosfer Değiştirici:**
  - Gündüz Güneşi, Kapadokya Gün Batımı (Altın Saat) ve Gece UV Biyo-Işıma modları.

---

### 👑 2. Host & Küratör Yönetici Stüdyosu (`admin.html`)
- **3D Model Ekleme (.GLB / .GLTF):**
  - Host (sanatçı veya belediye), hazırladığı herhangi bir 3D heykel dosyasını sürükleyip bırakarak anında sergiye ekleyebilir.
  - Eser adı, sanatçı, İngilizce açıklama ve varsayılan ölçek belirlenebilir.
- **Canlı 3D Model İnceleme:**
  - Yönetici panelinde yerleşik Three.js 3D önizleme masası (Orbit Controls ile 360° döndürme, inceleme).
- **🖨️ Baskıya Hazır QR Kod Stüdyosu (Print-Ready QR):**
  - Tüm sergi ana girişi için veya her heykel için ayrı ayrı **derin linkli QR kodlar** (`?sculpture=chimera`, `?sculpture=steed` vb.) üretir.
  - Yüksek çözünürlüklü PNG çıktısı veya doğrudan tarayıcıdan **"Tabela Yazdır"** ile kaidelere yapıştırılacak hazır A4/A5 afiş formatı.
- **💾 Ayarları Dışa/İçe Aktar:**
  - Tüm sergi konfigürasyonunu `JSON` dosyası olarak yedekleme ve geri yükleme.

---

### 🗿 3. Dahili Hazır Ürgüp Heykel Koleksiyonu

1. **Ürgüp Kimerası (The Chimera of Urgup):**
   - Asırlık asma kökleri ve yarı saydam reçinenin melezleştiği, içten biyo-ışık nabzı atan çağdaş biyo-fosil anıt.
2. **Kapadokya Asil Atı (Sacred Steed):**
   - "Güzel Atlar Ülkesi" Katpatuka'ya adanmış, fütüristik poligonel bronz ve altın varak patineli çağdaş at heykeli.
3. **GıLAMA Asma Kökü & Kutsal Kalp:**
   - Ürgüp bağlarının 120 yıllık asma kütükleri, kehribar kristaller ve adreslenebilir mikro-LED lifleri.
4. **Peri Bacası Kristal Monoliti:**
   - Volkanik tüf taşının ortadan yarılarak içindeki mor ametist jeot kristallerini sergilediği anıtsal dikilitaş.
5. **+ Host'un Ekleyebileceği Özel Modeller (.glb).**

---

## 🔬 Teknik Mimari (REA & WebAR Analizi)

Proje, kullanıcının incelediği **8th Wall**, **MyWebAR**, **Three.js WebXR** ve **ImmersiveWeb** standartlarının tersine mühendislik (REA) analizleriyle geliştirilmiştir:

```text
┌────────────────────────────────────────────────────────┐
│               Turist Mobil Tarayıcısı                  │
│       (Safari iOS / Chrome Android / Herhangi Bir Cihaz) │
└──────────────────────────┬─────────────────────────────┘
                           │
           ┌───────────────┴───────────────┐
           ▼                               ▼
┌──────────────────────┐       ┌────────────────────────┐
│  Kamera Arka Planı   │       │  Three.js WebGL Sahnesi │
│  (getUserMedia feed) │       │  (Şeffaf, Alpha: true)  │
└──────────┬───────────┘       └───────────┬────────────┘
           │                               │
           │  ┌─────────────────────────┐  │
           └─►│ Composite Canvas Engine ├◄─┘
              │ (Fotoğraf / Video Kaydı)│
              └────────────┬────────────┘
                           ▼
              ┌─────────────────────────┐
              │  Yüksek Çözünürlük JPG  │
              │  & WebM/MP4 Video İndir │
              └─────────────────────────┘
```

1. **Kamera Akışı:** `navigator.mediaDevices.getUserMedia` ile 1080p arka kamera (`environment`) video elementine bağlanır.
2. **WebGL Render & Gölge:** Three.js sahnesi şeffaf zemin üzerinde çalışır. `THREE.ShadowMaterial` zemin düzlemi sayesinde dijital heykel meydana gerçekten ayak basmış gibi gölge düşürür.
3. **Zemin Tespiti (Reticle):** Ekran merkezinden fırlatılan Raycast ışını, sanal zeminle kesiştiği yerde altın renkli hedefleme halkasını oluşturur.
4. **Sensör & Jiroskop:** `DeviceOrientationEvent` açıları kameraya yansıtılarak telefon hareket ettirildiğinde heykelin etrafında fiziken dolaşma hissi verilir.
5. **Kompozit Çekim:** Fotoğraf veya video çekilirken gizli bir canvas üzerinde video karesi + Three.js karesi + Ürgüp filigranı birleştirilerek `MediaRecorder` ile kaydedilir.

---

## 🚀 Hızlı Başlangıç & Yerel Test

### Yöntem 1: Yerel Bilgisayarda Çift Tıklayarak Çalıştırma
Klasör içindeki **`start_server.bat`** dosyasına çift tıklayın!
- Otomatik olarak yerel HTTP sunucusu açılır ve tarayıcınızda açılır:
  - **Turist Görünümü:** `http://localhost:8080/index.html`
  - **Host Stüdyosu:** `http://localhost:8080/admin.html`

### Yöntem 2: Cep Telefonunda Test Etme
Mobil tarayıcılar kamera erişimi için `https://` gerektirir. Bunu en hızlı şekilde test etmenin 2 yolu vardır:

1. **Vercel / Netlify ile (Tavsiye Edilen - 1 Dakika):**
   - Bu klasörü [Vercel](https://vercel.com) veya [Netlify](https://netlify.com) üzerine sürükleyip bırakın (Drop).
   - Size anında `https://urgup-meydan-ar.vercel.app` gibi ücretsiz bir HTTPS linki verecektir.
   - Admin stüdyosuna bu linki yazıp oluşan QR kodun çıktısını alın!
2. **GitHub Pages ile:**
   - Projeyi bir GitHub reposuna yükleyip `Settings > Pages` kısmından aktif edin.

---

## 📂 Dizin Yapısı

```text
urgup_meydan_webar/
│
├── index.html                  # 📱 Turist WebAR Deneyimi (AR, Kamera, Çekim, Heykeller)
├── admin.html                  # 👑 Host & Küratör Yönetici Stüdyosu (3D Model Yükleme, QR Üretici)
├── start_server.ps1            # 🚀 Yerel PowerShell HTTP test sunucusu
├── start_server.bat            # ⚡ Çift tıklanabilir başlatıcı
├── README.md                   # 📖 Kapsamlı Dokümantasyon
│
└── assets/
    ├── css/
    │   └── style.css           # Karanlık lüks cam morfizmi ve responsive stiller
    ├── js/
    │   ├── webar-engine.js      # Çekirdek WebAR motoru (Kamera, zemin, reticle, jestler)
    │   ├── sculpture-library.js # 4 Prosedürel Ürgüp heykeli + GLB dosya yükleyici
    │   ├── capture-engine.js    # Fotoğraf kompozit & MediaRecorder video kayıt motoru
    │   ├── qrcode-generator.js  # Tabela baskısına hazır QR kod motoru
    │   ├── audio-guide.js       # Türkçe/İngilizce sesli rehber & ambiyans motoru
    │   └── host-admin.js        # Host stüdyosu yönetim ve 3D önizleme mantığı
    ├── models/                 # Özel .glb modelleri için klasör
    └── images/                 # İkonlar ve görseller
```

---

## 🎨 Sanatçılar & Katkıda Bulunanlar
- **Proje:** Ürgüp Meydanı Açık Hava Dijital Heykel Sunumu
- **Tasarım & Mimari:** Ra Studio & Bilgesu
- **Lokasyon:** Ürgüp Meydanı, Kapadokya, Türkiye
