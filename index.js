const path = require("path"); // Mengimpor module path bawaan Node.js untuk memanipulasi dan menyelesaikan path file
const express = require("express"); // Mengimpor framework Express untuk membuat aplikasi web
const methodOverride = require("method-override"); // Mengimpor method-override untuk mengubah method HTTP POST menjadi PUT/DELETE
const mongoose = require("mongoose"); // Mengimpor mongoose untuk berinteraksi dengan MongoDB sebagai database
const app = express(); // Inisialisasi aplikasi Express
const errorHandler = require("./errorHandler"); // Mengimpor middleware custom error handler dari file errorHandler.js
const port = 3000; // Menyimpan port server di variabel port
const session = require("express-session"); // Mengimpor express-session untuk manajemen session
const flash = require("connect-flash"); // Mengimpor connect-flash untuk menampilkan pesan flash

// Models
const Product = require("./models/product"); // Mengimpor model Product dari folder models untuk berinteraksi dengan database
const Garment = require("./models/garment"); // Mengimpor model Garment dari folder models untuk berinteraksi dengan database

// Connect to mongodb
mongoose
  .connect("mongodb://127.0.0.1/shop_db") // Menghubungkan aplikasi ke database MongoDB lokal bernama 'shop_db'
  .then((result) => {
    console.log("Connected to mongodb"); // Menampilkan pesan di console jika koneksi MongoDB berhasil
  })
  .catch((err) => {
    console.log(err); // Menampilkan pesan error jika koneksi MongoDB gagal
  });

//  middleware
app.set("views", path.join(__dirname, "views")); // Mengatur lokasi folder views untuk menyimpan template EJS
app.set("view engine", "ejs"); // Mengatur template engine EJS untuk rendering tampilan
app.use(express.urlencoded({ extended: true })); // Middleware untuk parsing request body dalam bentuk URL-encoded (misal dari form)
app.use(methodOverride("_method")); // Middleware yang memungkinkan penggunaan PUT/DELETE melalui parameter query string "_method"
app.use(
  session({
    secret: "keyboard cat", // Secret key untuk mengenkripsi session
    resave: false, // Menyatakan apakah session harus disimpan ulang ke penyimpanan session
    saveUninitialized: false, // Menyatakan apakah session harus disimpan jika tidak ada data yang disimpan
  })
);
app.use(flash()); // Middleware untuk menampilkan pesan flash

app.use((req, res, next) => {
  res.locals.flash_messages = req.flash("flash_messages");
  next();
});

// Fungsi pembungkus untuk menangani async error di route handlers
function wrapAsync(fn) {
  return function (req, res, next) {
    fn(req, res, next).catch((err) => next(err)); // Jika ada error di handler, akan di-pass ke middleware error handling
  };
}

// Route untuk halaman utama
app.get("/", (req, res) => {
  res.send("Selamat datang di Products dan Garments"); // Mengirimkan teks "Hello World" saat mengakses URL root "/"
});

// Route untuk menampilkan semua garments
app.get(
  "/garments",
  wrapAsync(async (req, res) => {
    const garments = await Garment.find({}); // Mengambil semua garment dari database
    res.render("garments/index", {
      garments,
      message: req.flash("flash_messages"),
    }); // Render halaman index.ejs dengan daftar garment
  })
);

// Route untuk menampilkan form pembuatan garment
app.get("/garments/create", (req, res) => {
  res.render("garments/create"); // Render form untuk membuat garment baru
});

// Route untuk menambahkan garment baru
app.post(
  "/garments",
  wrapAsync(async (req, res) => {
    const garment = new Garment(req.body); // Membuat instance Garment baru berdasarkan data yang dikirimkan di request body
    await garment.save(); // Menyimpan garment baru ke database MongoDB
    req.flash("flash_messages", "berhasil menambahkan data"); // Menampilkan pesan flash sukses
    res.redirect(`/garments`); // Redirect ke halaman daftar garment
  })
);

// Route untuk menampilkan detail garment berdasarkan ID
app.get(
  "/garments/:id",
  wrapAsync(async (req, res) => {
    const { id } = req.params; // Mendapatkan parameter id dari URL
    const garment = await Garment.findById(id).populate("products"); // Mencari garment berdasarkan ID dan populate produk yang terkait
    res.render("garments/show", { garment }); // Render halaman show.ejs untuk menampilkan detail garment
  })
);

// Route untuk menampilkan form pembuatan produk baru untuk garment tertentu
app.get("/garments/:garment_id/products/create", (req, res) => {
  const garment_id = req.params.garment_id;
  res.render("products/create", { garment_id });
});

// Route untuk menambahkan produk baru ke garment tertentu
app.post(
  "/garments/:garment_id/products",
  wrapAsync(async (req, res) => {
    const { garment_id } = req.params; // Mendapatkan parameter garment_id dari URL
    const garment = await Garment.findById(garment_id); // Mencari garment berdasarkan ID
    const product = new Product(req.body); // Membuat instance Product baru berdasarkan data yang dikirimkan di request body
    garment.products.push(product); // Menambahkan produk baru ke array produk dalam garment
    product.garment = garment; // Menambahkan referensi garment ke dalam product
    await garment.save(); // Menyimpan garment yang sudah diperbarui
    await product.save(); // Menyimpan produk baru ke database MongoDB
    console.log(garment); // Mencetak garment yang diperbarui ke console untuk debugging
    res.redirect(`/garments/${garment_id}`); // Redirect ke halaman detail garment
  })
);

// Route untuk menghapus garment berdasarkan ID
app.delete(
  "/garments/:garment_id",
  wrapAsync(async (req, res) => {
    const { garment_id } = req.params; // Mendapatkan parameter garment_id dari URL
    await Garment.findOneAndDelete({ _id: garment_id }); // Menghapus garment dari database berdasarkan ID
    res.redirect("/garments"); // Redirect ke halaman daftar garment
  })
);

// Route untuk menampilkan daftar produk
app.get("/products", async (req, res) => {
  const { category } = req.query; // Mendapatkan parameter query category dari URL (opsional)
  if (category) {
    const products = await Product.find({ category }); // Mencari produk berdasarkan kategori dari database
    res.render("products/index", { products, category }); // Render halaman index.ejs dengan daftar produk berdasarkan kategori
  } else {
    const products = await Product.find({}); // Mengambil semua produk dari database
    res.render("products/index", { products, category: "All" }); // Render halaman index.ejs dengan semua produk
  }
});

// Route untuk menampilkan form pembuatan produk baru
app.get("/products/create", (req, res) => {
  res.render("products/create"); // Render form untuk membuat produk baru
});

// Route untuk menambahkan produk baru
app.post(
  "/products",
  wrapAsync(async (req, res) => {
    const product = new Product(req.body); // Membuat instance Product baru berdasarkan data yang dikirimkan di request body
    await product.save(); // Menyimpan produk baru ke database MongoDB
    res.redirect(`/products/${product._id}`); // Redirect ke halaman detail produk yang baru dibuat
  })
);

// Route untuk menampilkan detail produk berdasarkan ID
app.get(
  "/products/:id", // URL parameter ':id' menunjukkan ID unik produk yang diminta
  wrapAsync(async (req, res) => {
    const { id } = req.params; // Mengambil nilai parameter 'id' dari URL dan menyimpannya dalam variabel 'id'

    // Mencari produk berdasarkan ID di database dan mengisi (populate) properti 'garment'
    // Ini akan membawa semua data terkait 'garment' ke dalam objek produk jika ada relasi
    const product = await Product.findById(id).populate("garment");

    // Jika produk tidak ditemukan, buat pesan flash dan redirect ke halaman daftar produk
    if (!product) {
      req.flash("flash_messages", "Produk tidak ditemukan"); // Mengatur pesan flash jika ID produk tidak valid
      return res.redirect("/products"); // Redirect ke halaman daftar produk
    }

    // Jika produk ditemukan, render template 'show.ejs' di folder 'products' dengan data 'product'
    res.render("products/show", { product });
  })
);

// Route untuk menampilkan form edit produk
app.get(
  "/products/:id/edit",
  wrapAsync(async (req, res) => {
    const { id } = req.params; // Mendapatkan parameter id dari URL
    const product = await Product.findById(id); // Mencari produk berdasarkan ID dari database
    res.render("products/edit", { product }); // Render halaman edit.ejs dengan data produk yang akan diedit
  })
);

// Route untuk memperbarui produk berdasarkan ID
app.put(
  "/products/:id",
  wrapAsync(async (req, res) => {
    const { id } = req.params; // Mendapatkan parameter id dari URL
    const product = await Product.findByIdAndUpdate(id, req.body, {
      runValidators: true, // Menjalankan validasi berdasarkan skema Mongoose
    });
    res.redirect(`/products/${product._id}`); // Redirect ke halaman detail produk yang telah diperbarui
  })
);

// Route untuk menghapus produk berdasarkan ID
app.delete(
  "/products/:id",
  wrapAsync(async (req, res, next) => {
    const { id } = req.params; // Mendapatkan parameter id dari URL
    await Product.findByIdAndDelete(id); // Menghapus produk dari database berdasarkan ID
    res.redirect("/products"); // Redirect ke halaman daftar produk setelah penghapusan berhasil
  })
);

// Fungsi validatorHandler untuk menangani error validasi Mongoose
const validatorHandler = (err) => {
  err.status = 400; // Mengatur status error menjadi 400 (Bad Request)
  err.message = Object.values(err.errors).map((item) => item.message); // Mengambil pesan dari setiap error validasi dan memasukkannya ke dalam array
  return new errorHandler(err.message, err.status); // Mengembalikan errorHandler baru dengan pesan error dan status yang sudah diatur
};

// Middleware global untuk menangani error
app.use((err, req, res, next) => {
  console.log(err); // Mencetak error ke console untuk debugging
  if (err.name === "validationError") err = validatorHandler(err); // Memproses error validasi dengan validatorHandler

  if (err.name === "castError") {
    // Jika ada error cast (misalnya ID produk tidak valid)
    err.status = 400; // Mengatur status error menjadi 400 (Bad Request)
    err.message = "Product ID not found"; // Menyediakan pesan error yang lebih jelas
  }

  next(err); // Meneruskan error yang telah dimodifikasi ke middleware error handling berikutnya
});

// Middleware error handler akhir untuk menangani error yang dilempar dari route
app.use((err, req, res, next) => {
  const { status = 500, message = "something went wrong" } = err; // Menangkap status dan pesan dari error
  res.status(status).send(message); // Mengirimkan response dengan status dan pesan error
});

// Menjalankan server di port 3000
app.listen(port, () => {
  console.log("Shop App listening on port http://127.0.0.1:3000"); // Menampilkan pesan saat server berhasil berjalan di port 3000
});
