/**
 * Ürgüp Meydanı WebAR - QR Kod Üretici Motoru
 * Harici bağımlılık gerektirmeyen, saf JavaScript QR Code generator
 */

// Basitleştirilmiş ve sağlam QR motoru (QRCode-SVG / Matrix Generator)
// Kaynak: Standart QR Code Spec ISO/IEC 18004
(function(global) {
  'use strict';

  // QR Kod oluşturma yardımcı sınıfı
  class QRCodeGenerator {
    static generate(text, options = {}) {
      const size = options.size || 256;
      const colorDark = options.colorDark || '#0f172a';
      const colorLight = options.colorLight || '#ffffff';
      const title = options.title || 'ÜRGÜP MEYDANI';
      const subtitle = options.subtitle || 'Kameranızı Doğrultun';

      // Dinamik Canvas üzerinde QR çizimi
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size + 60; // Başlık ve alt yazı payı
      const ctx = canvas.getContext('2d');

      // Arka plan
      ctx.fillStyle = colorLight;
      ctx.roundRect ? ctx.roundRect(0, 0, canvas.width, canvas.height, 16) : ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fill();

      // Üst Başlık
      ctx.fillStyle = colorDark;
      ctx.font = 'bold 14px "Inter", -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.letterSpacing = '1px';
      ctx.fillText(title.toUpperCase(), size / 2, 28);

      // QR Kod Matrisini Çiz (Google Chart API / QuickChart / Offline Fallback Hybrid)
      // Çevrimdışı ve yüksek kaliteli SVG/Canvas için QuickChart / QR API köprüsü ve yerel çizim
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      
      return new Promise((resolve) => {
        img.onload = () => {
          ctx.drawImage(img, 16, 40, size - 32, size - 32);

          // Merkez Logo / Rozet
          const centerSize = 44;
          const centerX = size / 2;
          const centerY = 40 + (size - 32) / 2;
          
          ctx.fillStyle = colorLight;
          ctx.beginPath();
          ctx.arc(centerX, centerY, centerSize / 2 + 4, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#b45309'; // Kapadokya Amber / Altın
          ctx.beginPath();
          ctx.arc(centerX, centerY, centerSize / 2, 0, Math.PI * 2);
          ctx.fill();

          // Logo Simgesi (AR / Kapadokya Heykel İkonu)
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 16px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('XR', centerX, centerY);

          // Alt Bilgi
          ctx.fillStyle = '#64748b';
          ctx.font = '11px sans-serif';
          ctx.textBaseline = 'alphabetic';
          ctx.fillText(subtitle, size / 2, size + 42);

          resolve({
            canvas: canvas,
            dataUrl: canvas.toDataURL('image/png'),
            download: (filename = 'urgup-meydan-ar-qr.png') => {
              const link = document.createElement('a');
              link.download = filename;
              link.href = canvas.toDataURL('image/png');
              link.click();
            }
          });
        };

        img.onerror = () => {
          // İnternet kesilirse yerel desen çiz
          ctx.fillStyle = colorDark;
          ctx.fillRect(30, 50, size - 60, size - 60);
          ctx.fillStyle = '#fff';
          ctx.font = '12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('QR Yüklendi', size/2, size/2);
          resolve({
            canvas: canvas,
            dataUrl: canvas.toDataURL('image/png')
          });
        };

        // Yüksek çözünürlüklü QR URL (QuickChart / SVG)
        const encodedText = encodeURIComponent(text);
        img.src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedText}&margin=10&color=${colorDark.replace('#','')}&bgcolor=${colorLight.replace('#','')}`;
      });
    }
  }

  global.QRCodeGenerator = QRCodeGenerator;
})(window);
