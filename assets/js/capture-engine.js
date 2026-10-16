/**
 * Ürgüp Meydanı WebAR - Fotoğraf ve Video Yakalama Motoru (Capture Engine)
 * Canlı kamera görüntüsü ile Three.js 3D heykel katmanını birleştirir.
 * Yüksek çözünürlüklü fotoğraf (JPEG) ve video kaydı (MediaRecorder/WebM/MP4) sağlar.
 */

class CaptureEngine {
  constructor(videoElement, webglCanvas) {
    this.video = videoElement;
    this.canvas = webglCanvas;
    this.isRecording = false;
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.recordingStartTime = null;
    this.recordingTimerInterval = null;

    // Kompozit (birleştirme) gizli canvas
    this.compositeCanvas = document.createElement('canvas');
    this.ctx = this.compositeCanvas.getContext('2d', { alpha: false, desynchronized: true });
    this.animFrameId = null;
  }

  // Fotoğraf çek ve indir
  async capturePhoto(statueInfo = {}) {
    const width = this.canvas.width || window.innerWidth;
    const height = this.canvas.height || window.innerHeight;

    this.compositeCanvas.width = width;
    this.compositeCanvas.height = height;

    // 1. Canlı kamera görüntüsünü çiz (arka plan)
    if (this.video && this.video.readyState >= 2) {
      // Kameranın aspect ratio'sunu koruyarak cover modunda çiz
      const vWidth = this.video.videoWidth || width;
      const vHeight = this.video.videoHeight || height;
      const scale = Math.max(width / vWidth, height / vHeight);
      const x = (width - vWidth * scale) / 2;
      const y = (height - vHeight * scale) / 2;
      this.ctx.drawImage(this.video, x, y, vWidth * scale, vHeight * scale);
    } else {
      // Kamera yoksa estetik meydan gradyanı çiz
      const grad = this.ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, '#1e1b4b');
      grad.addColorStop(1, '#0f172a');
      this.ctx.fillStyle = grad;
      this.ctx.fillRect(0, 0, width, height);
    }

    // 2. Three.js 3D Heykel katmanını çiz
    this.ctx.drawImage(this.canvas, 0, 0, width, height);

    // 3. Ürgüp Meydanı Filigran / Kartvizit Rozeti
    this.drawWatermark(this.ctx, width, height, statueInfo);

    // 4. Blob oluştur ve indir
    return new Promise((resolve) => {
      this.compositeCanvas.toBlob(async (blob) => {
        const filename = `urgup-meydan-ar-${statueInfo.id || 'heykel'}-${Date.now()}.jpg`;
        const url = URL.createObjectURL(blob);

        // Web Share API destekleniyorsa telefonda doğrudan paylaş / kaydet
        if (navigator.canShare && navigator.canShare({ files: [new File([blob], filename, { type: 'image/jpeg' })] })) {
          try {
            await navigator.share({
              title: 'Ürgüp Meydanı AR Heykel Fotoğrafım',
              text: `${statueInfo.name || 'Heykel'} - Ürgüp Meydanı Açık Hava Dijital Sergisi`,
              files: [new File([blob], filename, { type: 'image/jpeg' })]
            });
          } catch (e) {
            this.downloadFile(url, filename);
          }
        } else {
          this.downloadFile(url, filename);
        }

        resolve({ url, blob, filename });
      }, 'image/jpeg', 0.95);
    });
  }

  // Video kaydı başlat
  async startRecording(statueInfo = {}, onTimerUpdate = null) {
    if (this.isRecording) return;

    this.recordedChunks = [];
    const width = this.canvas.width || window.innerWidth;
    const height = this.canvas.height || window.innerHeight;

    this.compositeCanvas.width = width;
    this.compositeCanvas.height = height;

    // Sürekli çizim döngüsü
    const drawLoop = () => {
      if (!this.isRecording) return;

      if (this.video && this.video.readyState >= 2) {
        const vWidth = this.video.videoWidth || width;
        const vHeight = this.video.videoHeight || height;
        const scale = Math.max(width / vWidth, height / vHeight);
        const x = (width - vWidth * scale) / 2;
        const y = (height - vHeight * scale) / 2;
        this.ctx.drawImage(this.video, x, y, vWidth * scale, vHeight * scale);
      } else {
        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(0, 0, width, height);
      }

      // Three.js sahnesi
      this.ctx.drawImage(this.canvas, 0, 0, width, height);

      // Filigran
      this.drawWatermark(this.ctx, width, height, statueInfo);

      this.animFrameId = requestAnimationFrame(drawLoop);
    };

    this.isRecording = true;
    drawLoop();

    // Composite canvas'tan 30fps akış al
    const stream = this.compositeCanvas.captureStream(30);

    // Desteklenen video MIME türünü belirle
    let mimeType = 'video/webm;codecs=vp9';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm;codecs=vp8';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/mp4';
        }
      }
    }

    try {
      this.mediaRecorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4000000 });
    } catch (e) {
      this.mediaRecorder = new MediaRecorder(stream);
    }

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    this.mediaRecorder.start(250); // Her 250ms'de bir veri parçası
    this.recordingStartTime = Date.now();

    // Zamanlayıcı
    if (onTimerUpdate) {
      this.recordingTimerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - this.recordingStartTime) / 1000);
        const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
        const secs = String(elapsed % 60).padStart(2, '0');
        onTimerUpdate(`${mins}:${secs}`);
      }, 500);
    }
  }

  // Video kaydını durdur ve indir
  stopRecording(statueInfo = {}) {
    return new Promise((resolve) => {
      if (!this.isRecording || !this.mediaRecorder) {
        resolve(null);
        return;
      }

      this.isRecording = false;
      cancelAnimationFrame(this.animFrameId);
      clearInterval(this.recordingTimerInterval);

      this.mediaRecorder.onstop = async () => {
        const mime = this.mediaRecorder.mimeType || 'video/webm';
        const ext = mime.includes('mp4') ? 'mp4' : 'webm';
        const blob = new Blob(this.recordedChunks, { type: mime });
        const filename = `urgup-meydan-video-${statueInfo.id || 'heykel'}-${Date.now()}.${ext}`;
        const url = URL.createObjectURL(blob);

        // Paylaş veya doğrudan indir
        if (navigator.canShare && navigator.canShare({ files: [new File([blob], filename, { type: mime })] })) {
          try {
            await navigator.share({
              title: 'Ürgüp Meydanı AR Heykel Videosu',
              text: `${statueInfo.name || 'Heykel'} - Ürgüp Meydanı Açık Hava Dijital Sergisi`,
              files: [new File([blob], filename, { type: mime })]
            });
          } catch (e) {
            this.downloadFile(url, filename);
          }
        } else {
          this.downloadFile(url, filename);
        }

        resolve({ url, blob, filename });
      };

      this.mediaRecorder.stop();
    });
  }

  // Zarif Ürgüp Meydanı Filigranı & Rozeti
  drawWatermark(ctx, w, h, statue) {
    ctx.save();
    
    // Alt Bilgi Şeridi
    const badgeW = Math.min(w * 0.9, 440);
    const badgeH = 54;
    const badgeX = (w - badgeW) / 2;
    const badgeY = h - badgeH - 24;

    // Yarı saydam lüks zemin
    ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
    ctx.roundRect ? ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 14) : ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
    ctx.fill();

    // Altın çerçeve
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Rozet İkonu (Kapadokya Güneşi)
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(badgeX + 28, badgeY + badgeH / 2, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('XR', badgeX + 28, badgeY + badgeH / 2);

    // Eser & Konum Metni
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    const titleText = statue.name || 'Ürgüp Meydanı Heykeli';
    ctx.fillText(titleText, badgeX + 52, badgeY + 22);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText('📍 Ürgüp Meydanı Açık Hava Dijital Heykel Sunumu', badgeX + 52, badgeY + 39);

    ctx.restore();
  }

  // Dosya indirme yardımcısı
  downloadFile(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
    }, 200);
  }
}

window.CaptureEngine = CaptureEngine;
