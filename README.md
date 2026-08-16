# MetinBall 3D — GitHub Pages sürümü

Bu paket, MetinBall'ın gerçek rig'li 3D karakter altyapısına geçirilmiş ilk tam oynanabilir GitHub Pages sürümüdür.

## İçerik
- Gerçek skinned/rigged 3D humanoid karakter
- 4 karakter seçimi: Turgut, Zeko, Nafi, Baki
- 5 oynanabilir görev
- Idle / Walk / Run animasyon geçişleri
- Zıplama, koşma, ateş etme, şarjör değiştirme oyun mekanikleri
- Kariyer / yıldız / en iyi skor kayıtları
- Ayarlar ve tam ekran
- Tarayıcı localStorage kayıt sistemi
- GitHub Pages uyumlu statik yapı

## GitHub Pages'e yükleme
1. GitHub'da yeni bir repository oluşturun. Önerilen ad: `metinball`.
2. Bu klasördeki DOSYALARIN TAMAMINI repository'nin kök dizinine yükleyin. `index.html` doğrudan kökte kalmalı.
3. GitHub'da: **Settings > Pages**.
4. **Build and deployment > Source** bölümünde **Deploy from a branch** seçin.
5. Branch: **main**, klasör: **/(root)** seçip **Save** deyin.
6. Birkaç dakika sonra oyun şu biçimde açılır:
   `https://KULLANICIADINIZ.github.io/metinball/`

## Önemli
Bu sürümde Three.js ve onaylanan rig'li Soldier.glb modeli internetten yüklenir. Bu nedenle GitHub Pages üzerinde çalışırken internet bağlantısı gerekir.

Dört oyun karakteri şu anda aynı kaliteli rig tabanını kullanır; oyun içi özellikleri ve renkleri farklıdır. Fotoğraftan kişiye özel gerçek 3D yüz/avatar üretimi bu sürümün parçası değildir.
