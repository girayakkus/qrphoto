# Nişan Fotoğrafları — QR Yükleme Uygulaması

Misafirlerin QR kodu okutup fotoğraf yükleyebildiği, senin de tek yerden
orijinal kalitede toplu indirebildiğin küçük bir web uygulaması.

- **Yükleme:** Misafirin telefonundan doğrudan Cloudinary'e gider — dosya
  hiç sıkıştırılmaz, orijinal haliyle saklanır.
- **Galeri:** Sadece PIN bilen (sen) görebilir.
- **QR kod:** Vercel'in verdiği gerçek domain üzerinden otomatik üretilir.

## 1) Cloudinary hesabı (ücretsiz)

1. https://cloudinary.com adresinden ücretsiz bir hesap aç.
2. Dashboard'un ana sayfasında şu üçünü not al: **Cloud Name**, **API Key**, **API Secret**.
3. Sol menüden **Settings > Upload > Upload presets** yoluna git, **Add upload preset**'e tıkla:
   - **Signing Mode:** `Unsigned` seç (misafirler API secret olmadan doğrudan yükleyebilsin diye).
   - **Preset name**'i not al (örn. `nisan-unsigned`).
   - İstersen **Folder** alanına `nisan-fotograflari` yazabilirsin.
   - (Opsiyonel) **Max file size**'ı yükseltmek istersen buradan ayarlayabilirsin;
     varsayılan genelde günün fotoğrafları için yeterlidir.
   - Kaydet.

## 2) Projeyi GitHub'a koy

```bash
cd nisan-foto-app
git init
git add .
git commit -m "ilk versiyon"
```

GitHub'da boş bir repo oluşturup push et (GitHub'ın sana verdiği komutlarla).

## 3) Vercel'e deploy et

1. https://vercel.com üzerinden GitHub hesabınla giriş yap.
2. **New Project** → biraz önce push ettiğin repoyu seç.
3. **Environment Variables** kısmına, `.env.local.example` dosyasındaki
   değişkenlerin **gerçek değerlerini** gir:

   | Değişken | Değer |
   |---|---|
   | `CLOUDINARY_CLOUD_NAME` | Cloudinary'deki cloud name |
   | `CLOUDINARY_API_KEY` | Cloudinary API key |
   | `CLOUDINARY_API_SECRET` | Cloudinary API secret |
   | `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | aynı cloud name |
   | `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` | oluşturduğun preset adı (örn. `nisan-unsigned`) |
   | `CLOUDINARY_FOLDER` | `nisan-fotograflari` |
   | `NEXT_PUBLIC_CLOUDINARY_FOLDER` | `nisan-fotograflari` |
   | `ORGANIZER_PIN` | kendi belirlediğin bir şifre, örn. `284719` |

4. **Deploy**'a bas. Birkaç dakika içinde `https://senin-projen.vercel.app`
   gibi gerçek bir adres alacaksın.

## 4) Kullanım

- O adrese girip sağ üstten **Organizatör**'e tıkla, PIN'ini gir.
- Açılan galeri ekranında bir QR kod göreceksin — bu, artık gerçek ve
  dışarıdan erişilebilir bir link olduğu için sorunsuz çalışır.
- Ekran görüntüsünü alıp bastırabilir, davetiye ya da masa kartlarına koyabilirsin.
- Misafirler QR'ı okutunca doğrudan yükleme ekranına düşer.
- Sen aynı adresten **Organizatör → PIN** ile galeriye girip tek tek ya da
  **"Tümünü ZIP indir"** ile hepsini birden indirebilirsin.

## Yerelde denemek istersen

```bash
npm install
cp .env.local.example .env.local   # sonra .env.local içindeki değerleri gerçekleriyle değiştir
npm run dev
```

`http://localhost:3000` adresinde açılır.

## Notlar

- **PIN koruması** basit ama etkilidir: galeriyi görüntüleme/silme
  işlemleri sunucu tarafında kontrol edilir, API secret hiçbir zaman
  tarayıcıya gitmez. Yine de banka seviyesinde bir güvenlik değildir —
  PIN'i sadece güvendiğin kişilerle paylaş.
- Cloudinary'nin ücretsiz planı cömerttir (aylık ~25 kredi = genelde
  binlerce fotoğraf için yeterli depolama/bant genişliği); çok büyük bir
  düğün/nişan için kullanım tahminini Cloudinary'nin fiyatlandırma
  sayfasından kontrol etmen iyi olur.
- "Tümünü ZIP indir" tüm fotoğrafları tarayıcı üzerinden indirip
  paketliyor — çok sayıda ve büyük fotoğrafta biraz zaman alabilir,
  bu normaldir.
# qrphoto
