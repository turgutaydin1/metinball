# MetinBall 3D — Sadık Karakter Sürümü V3

Bu sürüm, MetinBall'ın mevcut kimliğini 3D'ye taşır. Generic Soldier/robot modeli ve kırmızı küre hedefler kaldırılmıştır.

## Korunan MetinBall unsurları
- Turgut, Zeko, Nafi ve Baki karakter seçimi
- Karakterlerin kendi yüz referansları, kıyafet renkleri ve farklı oyun özellikleri
- Orijinal dört Mini Metin görselinden oluşturulan 3D Mini Metin karakterleri
- 5 görev: Metin Yağmuru, Silahlı Metin Baskını, Metin Kaçıyor, Ofisi Koru, Büyük Metin
- Bonus / sahte / kalkan / sivil / altın / boss türleri
- Kariyer, yıldız, skor ve localStorage kayıtları
- Kendi karakterini yükleme
- Ayarlar ve tam ekran

## 3D karakter hareketleri
Karakterler tek parça PNG olarak döndürülmez. Hiyerarşik 3D eklem sistemiyle baş, gövde, omuz, dirsek, kalça ve dizler ayrı hareket eder. Idle, yürüme, koşma, zıplama, çömelme, yakalama, nişan/ateş, şarjör ve darbe pozları vardır.

## GitHub Pages
`index.html` kök dizindedir. Pages kaynağı `main` ve `/(root)` olmalıdır.

Oyun adresi:
`https://turgutaydin1.github.io/metinball/`

## Windows PC
Repository'yi ZIP olarak indirip çıkardıktan sonra `METINBALL_BASLAT.cmd` dosyasına çift tıklayın. PowerShell tabanlı küçük yerel sunucu oyunu tarayıcıda açar; Node kurulumu gerekmez.

## İnternet
Three.js modülü jsDelivr CDN'den yüklendiği için bu V3 sürümünün açılışında internet bağlantısı gerekir. Karakter ve Mini Metin yüz görselleri repository içindeki JavaScript asset dosyalarına gömülüdür.
