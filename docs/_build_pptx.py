"""Pembangun sekali pakai untuk presentasi TripSpec hari ini. Bukan bagian demo."""
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.oxml.ns import qn
from pptx.util import Emu, Inches, Pt

OUT = "docs/TripSpec-2026-09-19.pptx"

INK = RGBColor(0x1C, 0x24, 0x30)
MUTED = RGBColor(0x5C, 0x66, 0x70)
TEAL = RGBColor(0x0E, 0x6B, 0x5C)
TEAL_DARK = RGBColor(0x12, 0x31, 0x2C)
PAPER = RGBColor(0xF7, 0xF4, 0xEF)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
SAND = RGBColor(0xE4, 0xC0, 0x7A)
CARD = RGBColor(0xFF, 0xFF, 0xFF)
RULE = RGBColor(0xD9, 0xD2, 0xC5)
RED = RGBColor(0x8C, 0x3A, 0x2F)

W = Inches(13.333)
H = Inches(7.5)


def rgb(color):
    return color


def set_run(run, text, size, bold=False, color=INK, font="Calibri"):
    run.text = text
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color
    run.font.name = font
    run.font.italic = False


def add_text(slide, left, top, width, height, text, size, bold=False, color=INK, font="Calibri", align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP):
    box = slide.shapes.add_textbox(left, top, width, height)
    tf = box.text_frame
    tf.word_wrap = True
    tf.auto_size = None
    tf.margin_left = Emu(0)
    tf.margin_right = Emu(0)
    tf.margin_top = Emu(0)
    tf.margin_bottom = Emu(0)
    try:
        tf._txBody.bodyPr.set("anchor", {MSO_ANCHOR.TOP: "t", MSO_ANCHOR.MIDDLE: "ctr", MSO_ANCHOR.BOTTOM: "b"}[anchor])
    except Exception:
        pass
    lines = text.split("\n")
    for i, line in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        p.space_after = Pt(0)
        p.space_before = Pt(0)
        run = p.add_run()
        set_run(run, line, size, bold, color, font)
    return box


def rect(slide, left, top, width, height, fill):
    shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill
    shape.line.fill.background()
    # drop shadow off
    sp = shape._element
    effect = sp.find(qn("p:style"))
    return shape


def notes(slide, text):
    ns = slide.notes_slide
    tf = ns.notes_text_frame
    tf.text = text.strip()


def footer(slide, n, total, dark=False):
    color = RGBColor(0xC9, 0xD4, 0xCE) if dark else MUTED
    add_text(slide, Inches(0.55), Inches(7.08), Inches(8), Inches(0.28), "TripSpec  ·  19 September 2026", 11, color=color)
    add_text(slide, Inches(11.2), Inches(7.08), Inches(1.6), Inches(0.28), f"{n}  /  {total}", 11, color=color, align=PP_ALIGN.RIGHT)


def new(prs, dark=False):
    layout = prs.slide_layouts[6]
    slide = prs.slides.add_slide(layout)
    rect(slide, 0, 0, W, H, TEAL_DARK if dark else PAPER)
    if not dark:
        rect(slide, 0, 0, Inches(0.12), H, TEAL)
    return slide


def kicker(slide, text, dark=False):
    add_text(slide, Inches(0.55), Inches(0.32), Inches(12), Inches(0.32), text.upper(), 13, True, SAND if dark else TEAL)


def title(slide, text, dark=False, top=0.62):
    add_text(slide, Inches(0.55), Inches(top), Inches(12.2), Inches(1.15), text, 32, True, WHITE if dark else INK)


def bullets(slide, items, top=1.9, size=20, color=INK, width=12.2):
    box = slide.shapes.add_textbox(Inches(0.55), Inches(top), Inches(width), Inches(4.9))
    tf = box.text_frame
    tf.word_wrap = True
    for i, item in enumerate(items):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        level = 1 if item.startswith("  ") else 0
        text = item.strip()
        p.level = level
        p.space_after = Pt(10 if level == 0 else 4)
        p.space_before = Pt(0)
        run = p.add_run()
        set_run(run, text, size - (2 if level else 0), False, color)
    return box


def code_block(slide, lines, top, height=2.4):
    shape = rect(slide, Inches(0.55), Inches(top), Inches(12.2), Inches(height), TEAL_DARK)
    box = slide.shapes.add_textbox(Inches(0.75), Inches(top + 0.15), Inches(11.8), Inches(height - 0.25))
    tf = box.text_frame
    tf.word_wrap = False
    for i, line in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.space_after = Pt(2)
        run = p.add_run()
        set_run(run, line, 16, False, WHITE, "Menlo")
    return shape


def node(slide, left, top, width, height, fill, head, sub="", head_color=WHITE, sub_color=None):
    shape = slide.shapes.add_shape(
        MSO_SHAPE.ROUNDED_RECTANGLE, Inches(left), Inches(top), Inches(width), Inches(height)
    )
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill
    shape.line.fill.background()
    add_text(
        slide,
        Inches(left + 0.12),
        Inches(top + 0.1),
        Inches(width - 0.24),
        Inches(0.4),
        head,
        14,
        True,
        head_color,
    )
    if sub:
        add_text(
            slide,
            Inches(left + 0.12),
            Inches(top + 0.48),
            Inches(width - 0.24),
            Inches(max(0.4, height - 0.58)),
            sub,
            12,
            False,
            sub_color or head_color,
        )
    return shape


def arrow(slide, left, top, width=0.32, height=0.22, down=False):
    kind = MSO_SHAPE.DOWN_ARROW if down else MSO_SHAPE.RIGHT_ARROW
    shape = slide.shapes.add_shape(kind, Inches(left), Inches(top), Inches(width), Inches(height))
    shape.fill.solid()
    shape.fill.fore_color.rgb = TEAL
    shape.line.fill.background()
    return shape


# --- slide ---

def s_title(prs, n, total):
    slide = new(prs, dark=True)
    add_text(slide, Inches(0.6), Inches(1.35), Inches(12), Inches(0.4), "DEMO MENGAJAR SDD  ·  19 SEPTEMBER 2026", 14, True, SAND)
    add_text(slide, Inches(0.6), Inches(1.9), Inches(12), Inches(1.3), "TripSpec", 60, True, WHITE)
    add_text(slide, Inches(0.6), Inches(3.3), Inches(11), Inches(1.2), "Seseorang mau liburan.\nKita susun rencananya dari panduan, bukan dari harga.\nModelnya tidak kita ganti.", 24, False, RGBColor(0xE7, 0xEE, 0xEA))
    add_text(slide, Inches(0.6), Inches(5.3), Inches(11), Inches(0.8), "Lima puluh menit.  Model yang sama dari awal sampai akhir.", 16, False, SAND)
    footer(slide, n, total, dark=True)
    notes(slide, """Buka pelan. Jangan mulai dari istilah.

Katakan: hari ini kita tidak mengganti model. Seseorang bilang mau ke Jepang. TripSpec menyusun rencana dari panduan lokal, menawarkan tiga penerbangan tanpa harga, lalu mengingatkan di aplikasi kalau penerbangannya dikunci.

Yang harus mereka bawa pulang: kalau jawabannya salah, kita ubah aturannya dan jalankan percakapan yang sama lagi. File modelnya tetap qwen3.5.

Jangan tarik model lain. Pack yang dinilai hari ini tripspec-nl@2026-09-19.4, ditulis dari contracts/vibe.md. Pack itu bukan spec, dan tidak masuk git.""")


def s_say(prs, n, total):
    slide = new(prs, dark=True)
    kicker(slide, "Kalimat pembuka", dark=True)
    add_text(slide, Inches(0.6), Inches(1.3), Inches(12), Inches(4.2), "Modelnya tidak kita latih ulang.\n\nKita tulis aturannya, nilai enam percakapan,\nsimpan hasilnya.\n\nChat mengikuti hasil itu.", 28, True, WHITE)
    footer(slide, n, total, dark=True)
    notes(slide, """Ucapkan sekali, lalu diam sebentar.

Modelnya tidak kita latih ulang. Kita tulis aturannya, nilai enam percakapan, simpan hasilnya. Chat mengikuti hasil itu. Kalau jawabannya salah, kita ubah aturannya dan nilai lagi. Modelnya tetap.

Lalu buka terminal dan jalankan npm run help. Hijau artinya langkah itu sudah ada di laptop ini. Kuning artinya belum. Kotak di bawah hanya satu perintah. Ikuti itu. Jangan loncat.""")


def s_persists(prs, n, total):
    slide = new(prs)
    kicker(slide, "Yang tersimpan di laptop ini")
    title(slide, "Empat berkas. Hanya satu yang dibaca chat.", top=0.58)
    rows = [
        ("Salinan Agent On Rails", "npm run strap", "Untuk langkah berikutnya. Bukan untuk chat."),
        ("Dokumen spec", "npm run specs", "Untuk kita buka. Chat tidak membacanya."),
        ("Catatan tiap alat", "perintah yang sama", "Chip di chat membukanya. Model tidak."),
        ("Laporan train", "npm run train", "Inilah yang ditiru chat, setiap jawaban."),
    ]
    top = 2.05
    for path, cmd, who in rows:
        rect(slide, Inches(0.55), Inches(top), Inches(12.2), Inches(1.05), WHITE)
        add_text(slide, Inches(0.75), Inches(top + 0.12), Inches(4.2), Inches(0.8), path, 18, True, TEAL)
        add_text(slide, Inches(5.0), Inches(top + 0.12), Inches(3.4), Inches(0.8), cmd, 16, False, INK)
        add_text(slide, Inches(8.4), Inches(top + 0.12), Inches(4.1), Inches(0.8), who, 16, False, MUTED)
        top += 1.15
    footer(slide, n, total)
    notes(slide, """Jelaskan tabel ini. File-file ini ditulis di mesin demo. Bukan sumber kebenaran di git.

vendor/aor adalah control plane Agent On Rails yang di-strap. Langkah berikutnya membacanya. Chatbot tidak.

specs/requirements dan specs/product dihasilkan npm run specs, dan lagi di awal npm run demo. Ruangan membukanya. Chatbot tidak membaca file itu.

specs/tools adalah satu markdown per alat di katalog. Chip di bawah balasan chat membuka file itu di editor. Model tidak membaca markdown. Model melihat deskripsi katalog.

specs/training/results/latest.md adalah yang ditiru chatbot. Setiap giliran chat menempelkan laporan ini ke prompt sistem yang dikirim ke Ollama.""")


def s_commands(prs, n, total):
    slide = new(prs)
    kicker(slide, "Rencana demo")
    title(slide, "Ikuti enam perintah ini. Jangan loncat.", top=0.58)
    code_block(slide, [
        "1   npm run pull         qwen3.5:latest di Ollama lokal",
        "2   npm run strap        salin Agent On Rails ke vendor/aor",
        "3   npm run contracts    vibe.md → pack dan skema",
        "4   npm run specs        hasilkan specs/          (gitignored)",
        "5   npm run train        pack + S1–S6 → latest.md",
        "6   npm run demo         hasilkan ulang specs, chat di :3000",
    ], top=2.0, height=3.7)
    footer(slide, n, total)
    notes(slide, """Enam perintah, berurutan. npm run help mencetak status di samping masing-masing.

1 pull. 2 strap. 3 contracts, dari vibe yang siap tempel. 4 specs. 5 train, yang menilai S1 sampai S6. 6 demo, yang menghasilkan ulang spec lalu membuka chat.

npm run train tidak memuat laporan sebelumnya. Skornya tetap mandiri. Hanya chatbot yang memuat laporan itu.

npm run demo tidak menjalankan enam skenario. Kalau hanya demo, dan latest.md hilang atau basi, chat akan mengatakannya.""")


def s_done(prs, n, total):
    slide = new(prs)
    kicker(slide, "Arti selesai")
    title(slide, "Hijau sudah ada. Kuning belum.", top=0.58)
    bullets(slide, [
        "Pull — model qwen3.5 sudah terpasang di Ollama.",
        "Strap — Agent On Rails sudah disalin ke laptop ini. Tidak masuk git.",
        "Contracts — cerita di vibe.md sudah jadi aturan untuk model.",
        "Specs — folder spec sudah terisi. Sisa file lama tidak dihitung.",
        "Train — laporan terbaru memakai aturan yang sama dengan yang di disk.",
        "Demo — chat di localhost:3000. Tanpa laporan, chat menolak menjawab.",
    ], top=1.95, size=18)
    footer(slide, n, total)
    notes(slide, """Jangan bacakan daftar. Tunjuk satu baris, lalu katakan artinya.

Pull: modelnya sudah hidup di Ollama. Kalau aplikasinya mati, langkah ini belum selesai walaupun filenya ada dari minggu lalu.

Strap: alat bantu sudah disalin ke laptop ini. Tidak masuk git.

Contracts: cerita di vibe.md sudah jadi aturan. Chat tidak membaca ceritanya. Ia membaca aturannya.

Specs: buka foldernya. Kalau isinya kosong, belum selesai. File sisa dari sesi lama tidak dihitung.

Train: laporan terbaru harus menyebut versi yang sama dengan aturan di disk, 2026-09-19.4. Laporan lama yang masih menyebut harga bukan demo ini.

Demo: buka localhost:3000. Kalau laporannya belum ada, chat menolak. Itu sengaja.""")


def s_pipeline(prs, n, total):
    slide = new(prs)
    kicker(slide, "Diagram")
    title(slide, "Satu arah. Jangan loncat.", top=0.52)
    row1 = [
        (TEAL, "1  pull", "qwen3.5:latest\ndi Ollama"),
        (TEAL, "2  strap", "Agent On Rails\nmasuk vendor/aor"),
        (TEAL, "3  contracts", "vibe.md menjadi\npack dan skema"),
    ]
    row2 = [
        (TEAL_DARK, "4  specs", "Dokumen untuk kita.\nBukan untuk chat."),
        (TEAL_DARK, "5  train", "Enam percakapan\nmenjadi laporan"),
        (TEAL_DARK, "6  demo", "Chat di :3000\ndari laporan itu"),
    ]
    def paint(items, top):
        left = 0.5
        for i, (fill, head, sub) in enumerate(items):
            node(slide, left, top, 3.55, 1.55, fill, head, sub)
            if i < len(items) - 1:
                arrow(slide, left + 3.62, top + 0.66)
            left += 4.15
    paint(row1, 2.05)
    arrow(slide, 6.45, 3.7, 0.28, 0.32, down=True)
    paint(row2, 4.15)
    footer(slide, n, total)
    notes(slide, """Tunjuk diagram ini selagi npm run help masih di layar.

Arahnya satu. Pull memasang model. Strap menyalin control plane ke vendor/aor, dan folder itu tidak di-commit. Contracts membaca contracts/vibe.md lalu menulis pack. Specs menulis folder yang dibuka ruangan; chatbot tidak membaca markdown itu. Train menilai S1 sampai S6 dan menyimpan latest.md. Demo menyalakan chat di port 3000 dari laporan itu.

Jangan loncat. Kotak kuning di help adalah satu-satunya perintah berikutnya.""")


def s_flow(prs, n, total):
    slide = new(prs)
    kicker(slide, "Percakapan yang kita tunjukkan")
    title(slide, "Dari “mau ke Jepang” sampai pengingat.", top=0.48)
    steps = [
        ("S1", "Mau ke Jepang\nPanduan, satu pertanyaan"),
        ("S6", "Jakarta, besok\nTiga penerbangan"),
        ("S3", "Nomor 2, hotel\nNama dan area"),
        ("S4", "Jam 3 pagi\nTidak ada di data"),
        ("S5", "Kunci opsi 2\nTiga pengingat"),
    ]
    left = 0.38
    width = 2.15
    for i, (sid, body) in enumerate(steps):
        node(slide, left, 2.05, width, 1.7, TEAL if i < 2 else TEAL_DARK, sid, body)
        if i < len(steps) - 1:
            arrow(slide, left + width + 0.04, 2.78, 0.28, 0.2)
        left += width + 0.36
    node(slide, 0.38, 4.15, 6.1, 1.45, WHITE, "S2  halaman baru", "Jakarta ke Bali, 12–15 Oktober, 2 orang.\nPanduan dan tiga penerbangan sekaligus. Jangan tanya asal.", INK, MUTED)
    node(slide, 6.7, 4.15, 6.15, 1.45, WHITE, "Yang tidak boleh", "Tanpa Rp, juta, atau rb.\nTanpa email, WhatsApp, atau voucher.", RED, MUTED)
    footer(slide, n, total)
    notes(slide, """Ceritakan seperti satu orang yang sedang merencanakan liburan. Jangan sebut nomor skenario dulu.

Mereka bilang mau ke Jepang. Kita jawab dengan panduan Tokyo dan satu pertanyaan: dari mana, kapan, atau berapa orang. Jangan tanya anggaran.

Mereka bilang dari Jakarta, besok, berdua dengan istri. Besok artinya besok, jangan minta tanggal lagi. Jangan ulang panduan. Beri tiga penerbangan, tanpa harga.

Mereka pilih nomor 2 dan minta hotel. Nama dan daerah saja.

Mereka tanya Garuda jam 3 pagi, 900 ribu. Tiket itu tidak ada. Kita tolak, dan tetap tidak sebut harga.

Mereka kunci pilihan dan minta diingatkan. Tiga pengingat di dalam aplikasi: 14 hari, 7 hari, 1 hari. Bukan email, bukan WhatsApp.

Kartu bawah adalah bentuk lain, di halaman baru: satu kalimat sudah lengkap, Jakarta ke Bali, 12 sampai 15 Oktober, dua orang.""")


def s_arch(prs, n, total):
    slide = new(prs)
    kicker(slide, "Diagram")
    title(slide, "Chat hanya membaca dua hal.", top=0.48)
    node(slide, 0.45, 1.95, 2.5, 1.15, TEAL, "cerita", "vibe.md. Ada di git.")
    arrow(slide, 3.05, 2.4)
    node(slide, 3.45, 1.95, 2.7, 1.15, TEAL, "aturan", "Untuk model. Tidak di git.")
    arrow(slide, 6.25, 2.4)
    node(slide, 6.65, 1.95, 2.7, 1.15, TEAL_DARK, "nilai", "Enam percakapan.")
    arrow(slide, 9.45, 2.4)
    node(slide, 9.85, 1.95, 2.95, 1.15, TEAL_DARK, "laporan", "Yang ditiru chat.")
    node(slide, 0.45, 3.7, 2.5, 1.15, WHITE, "requirements", "Dibaca npm run specs.", INK, MUTED)
    arrow(slide, 3.05, 4.15)
    node(slide, 3.45, 3.7, 2.7, 1.15, WHITE, "specs/", "Untuk ruangan.", INK, MUTED)
    node(slide, 6.65, 3.7, 6.15, 1.15, SAND, "Jawaban di layar", "aturan + laporan  →  model  →  chat", TEAL_DARK, TEAL_DARK)
    add_text(slide, Inches(0.5), Inches(5.15), Inches(12.2), Inches(1.3), "Model tidak membuka file spec.\nChip di bawah jawaban yang membuka file itu, supaya kita bisa membacanya.", 18, False, MUTED)
    footer(slide, n, total)
    notes(slide, """Gambar jalur data, bukan perintah.

Baris atas: contracts/vibe.md ada di git. npm run contracts mengubahnya menjadi pack. Pack bukan spec dan tidak di-commit. npm run train menilai S1 sampai S6 tanpa memuat laporan lama, lalu menulis latest.md. Chatbot meniru laporan itu.

Baris bawah: product/requirements.md dibaca npm run specs. Hasilnya folder specs/ yang dibuka ruangan. Chatbot tidak membaca markdown itu.

Gelembung chat hanya melihat pack dan latest.md, dikirim ke Ollama. Chip di bawah balasan membuka spec alat di editor. Mengedit markdown itu tidak mengubah balasan berikutnya. Ubah katalog, hasilkan ulang, lalu train lagi.""")


def s_inventory(prs, n, total):
    slide = new(prs)
    kicker(slide, "Inventaris")
    title(slide, "Harga ada di data. Chat tidak boleh melihatnya.", top=0.58)
    bullets(slide, [
        "Panduan yang ada: Bali, Tokyo kalau mereka bilang Jepang, dan Singapura.",
        "Penerbangan dari Jakarta: Bali, Singapura, dan Tokyo.",
        "Yang nyata ke Bali: QZ-751, GA-404, JT-39.",
        "Yang nyata ke Tokyo: JL-720, GA-880, QZ-202.",
        "Yang tidak ada: Garuda jam 3 pagi, dan hotel yang kita karang.",
        "Angka harga tetap di file data, lalu dibuang sebelum sampai ke model.",
    ], top=1.95, size=20)
    footer(slide, n, total)
    notes(slide, """Panduan di disk: Bali, Tokyo (dipakai saat traveler bilang Jepang), Singapore. Penerbangan di disk: Jakarta CGK ke DPS, SIN, dan NRT.

Harga ada di src/inventory/mock-data.ts supaya file tetap stabil. Harga dibuang sebelum model melihat JSON alat. Kalau penerbangan tidak ada di daftar itu, asisten bilang tidak ada di data dan tetap tidak mengutip tarif.

Baris CGK–DPS yang nyata adalah QZ-751, GA-404, dan JT-39. Demo ini tidak mencetak tarifnya. Yang diada-adakan adalah GA 712 jam 03:00, QZ 852, dan hotel yang tidak ada di daftar kota.""")


def s_why(prs, n, total):
    slide = new(prs)
    kicker(slide, "0–8 menit")
    title(slide, "Mulai dari kalimat orang, bukan dari menu.", top=0.58)
    bullets(slide, [
        "Mereka mau tahu kotanya, hari-harinya, dan apa yang tidak kita karang.",
        "Mereka tidak mau harga paket.",
        "Model yang “ramah” biasanya mengarang nomor pesawat dan tarif. Itu yang kita hindari.",
        "Kalau ditanya “ini Maya?”: cara melatihnya sama, produknya beda.",
        "  Maya memesan tiket kantor.",
        "  TripSpec menyusun liburan, lalu berhenti di pengingat di aplikasi.",
    ], top=1.95, size=20)
    footer(slide, n, total)
    notes(slide, """Buka dengan Mau ke Jepang.

Yang mereka mau kembali adalah kota yang diasumsikan panduan, hari-harinya, dan apa yang tidak akan diada-adakan. Mereka tidak mau harga paket.

Model yang membantu dengan prompt brosur menjawab kalimat yang sama dengan nomor penerbangan dan tarif. Itulah kegagalan yang dituju sisa sesi ini. Tidak perlu file tangkapan.

Kalau ada yang bertanya ini Maya, jawabannya: bentuk training sama dengan Maya SPEC-017 (spec, pack, skenario emas, eval), produknya beda. Maya memesan perjalanan korporat. TripSpec merencanakan itinerary liburan dan berhenti di daftar pengingat in-app.""")


def s_folders(prs, n, total):
    slide = new(prs)
    kicker(slide, "8–18 menit")
    title(slide, "Buka foldernya. Jangan percaya catatan pin saja.", top=0.55)
    bullets(slide, [
        "npm run specs menulis dokumen. Ia tidak menilai jawaban chat.",
        "specs/product — ini produknya siapa.",
        "specs/requirements — ini syaratnya. Inilah spec yang tersimpan.",
        "specs/training — bentuk ujiannya. Nilainya belum.",
        "contracts/vibe.md — cerita yang kita tempel. Dari sinilah aturan dibuat.",
    ], top=1.9, size=20)
    footer(slide, n, total)
    notes(slide, """Jalankan npm run help. Kalau langkah 4 masih not yet, jalankan npm run specs.

Jelaskan apa yang perintah itu lakukan selagi berjalan. Perintah ini tidak memanggil model chat untuk menilai balasan. Ia membaca product/requirements.md, menjalankan orkestrasi chatbot-training Agent On Rails (pin tercatat di .aor/aor-pin.json), lalu menerbitkan draf ke specs/. Pohon itu di-gitignore. Satu-satunya file yang terlacak di specs/ adalah .gitkeep.

Setelah selesai, buka foldernya. Jangan klaim sukses hanya dari pin.

specs/product: siapa produknya. Dihasilkan di run ini, tidak di-commit.
specs/requirements: spec persyaratan, SD-…. Inilah spec yang tersimpan.
specs/training: bentuk skenario dan daftar periksa eval. Bukan skornya. Skornya perintah berikutnya.
contracts/vibe.md: vibe siap tempel. Ada di git. npm run contracts membaca ini.
contracts/packs/tripspec-nl.baseline.json: apa yang diberitahu ke Ollama, dan apa yang dinilai npm run train. Ditulis AOR. Tidak di git. Versi 2026-09-19.4.""")


def s_rules(prs, n, total):
    slide = new(prs)
    kicker(slide, "Yang boleh dan yang tidak")
    title(slide, "Tiga larangan yang mudah diingat.", top=0.55)
    bullets(slide, [
        "Jangan sebut harga. Walaupun orangnya yang mengetik angkanya.",
        "Rencana hari datang dari panduan. Hanya saat mereka pertama kali menyebut tempat.",
        "Tiga pesawat: maskapai, nomor, jam. Hotel hanya setelah mereka memilih.",
        "Panduan tempat — hanya kalau kalimat ini menyebut negara atau kota.",
        "Cari pesawat — asal, tujuan, dan tanggal sudah ada. “Besok” sudah cukup.",
        "Hotel — nama dan daerah. Pengingat — tiga judul di dalam aplikasi.",
    ], top=1.9, size=18)
    footer(slide, n, total)
    notes(slide, """Bacakan tiga aturan keras, dari modules.reply_rules.hard_rules:

Jangan pernah menampilkan harga. Bahkan kalau traveler yang menuliskannya.
Itinerary datang dari panduan: ringkasan, area, musim, visa, lalu hari-harinya. Hanya di giliran mereka menyebut tempat.
Tiga penerbangan, masing-masing maskapai plus nomor plus jam. Nama penginapan hanya setelah dipilih. Tanpa tarif.

Alat ada di katalog pack. Menghasilkan ulang spec menulis satu markdown per alat ke specs/tools/. Chip di bawah balasan chat membuka file itu. Model tidak membaca markdown.

get_destination_guide: kalimat terakhir menyebut negara atau kota. Bukan di giliran berikutnya yang hanya mengisi asal, tanggal, atau jumlah orang.

search_flights: asal, tujuan, dan tanggal sudah diketahui. besok, lusa, dan hari ini dihitung. Maskapai, nomor, jam, dan tanggal itu. Tanpa tarif.

search_hotels: setelah memilih, atau ada kata hotel. Nama dan area. Tanpa tarif malam.

plan_notifications: kunci atau ingatkan. Judul dan jarak waktu in-app. Jangan tanya slot lagi.

compose.ts membangun prompt sistem dari pack, plus — hanya di chatbot — laporan train. Ia tidak membaca specs/requirements. Mengedit specs/tools tidak mengubah balasan berikutnya. Ubah katalog, hasilkan ulang, lalu jalankan train lagi.""")


def s_train(prs, n, total):
    slide = new(prs)
    kicker(slide, "18–36 menit")
    title(slide, "Kita menilai kalimatnya. Modelnya tidak berubah.", top=0.55)
    bullets(slide, [
        "Kuning: masih menunggu. Hijau: lulus. Merah: gagal.",
        "Data dibaca di laptop ini. Tidak ada panggilan ke maskapai.",
        "Model menjawab sekali, lalu kita baca teksnya.",
        "Diam beberapa puluh detik itu normal. Ia sedang menulis, bukan macet.",
        "Kalau ada Rp, juta, atau rb, nilai itu gagal.",
        "Laporan lama tidak ikut dinilai. Hanya chat yang membacanya.",
    ], top=1.9, size=20)
    footer(slide, n, total)
    notes(slide, """Jalankan npm run train. Bobot tetap. Skrip membungkus tiap skenario. Kuning menunggu. Hijau PASS. Merah FAIL.

Di balik layar, untuk masing-masing S1 sampai S6:

1. Alat paksa membaca inventaris secara lokal. Tanpa HTTP.
2. compose.ts membangun prompt sistem dari pack dan JSON itu. latest.md sebelumnya tidak ikut.
3. POST http://127.0.0.1:11434/v1/chat/completions, model qwen3.5:latest, temperatur 0.3, stream mati. Keheningan adalah putaran token, bukan macet, dan bukan training.
4. Juri di src/eval/judges.ts menilai teks. Tidak ada model kedua.
5. Harga di balasan (Rp, juta, rb) menggagalkan grounding. Templat yang mengganti balasan tidak berdasar juga tanpa harga.

Setelah S6 teks yang sama ditulis dua kali: file ber-cap waktu, dan specs/training/results/latest.md. Keduanya di-gitignore.

npm run help membandingkan versi pack di dalam latest.md dengan pack di disk. Kalau beda, train tetap not yet. Pack demo ini 2026-09-19.4. Laporan @2026-09-19.1 adalah perencana lama yang masih menyebut harga.""")


def s_bar(prs, n, total):
    slide = new(prs, dark=True)
    kicker(slide, "Kapan kita boleh bilang lulus", dark=True)
    add_text(slide, Inches(0.6), Inches(1.6), Inches(12), Inches(2.4), "Penolakan tiket palsu harus lulus.\nGiliran kedua juga harus lulus.\n\nDari enam, minimal lima hijau.", 32, True, WHITE)
    add_text(slide, Inches(0.6), Inches(4.6), Inches(11.5), Inches(1.4), "Satu yang merah masih boleh.\nBacalah dulu sebelum bilang ini sudah beres.", 22, False, SAND)
    footer(slide, n, total, dark=True)
    notes(slide, """Katakan pelan.

Dua hal wajib hijau. Pertama, chat menolak tiket yang tidak ada. Kedua, giliran berikutnya tidak mengulang panduan Jepang.

Dari enam percakapan, boleh satu yang merah. Jangan bilang “sudah beres” sebelum membuka yang merah itu.

Kalau bentuk jawabannya beda dari yang di slide, laporannya adalah buktinya. Perbaikannya di aturan, lalu nilai lagi. Bukan di model.""")


def scenario(prs, n, total, sid, when, sentence, see, note):
    slide = new(prs)
    kicker(slide, sid)
    title(slide, sentence, top=0.55)
    add_text(slide, Inches(0.55), Inches(1.85), Inches(12), Inches(0.4), when, 16, True, TEAL)
    bullets(slide, see, top=2.4, size=20)
    footer(slide, n, total)
    notes(slide, note)


def s_s1(prs, n, total):
    scenario(prs, n, total, "S1  ·  giliran pertama", "Alat: get_destination_guide saja", "“Mau ke Jepang.”", [
        "Tokyo. Shinjuku, Asakusa, Shibuya.",
        "Catatan musim dan catatan visa dari panduan.",
        "Hari 1 dan Hari 2.",
        "Satu pertanyaan: dari mana, kapan, atau berapa orang.",
        "Tanpa harga.",
    ], """S1. Mau ke Jepang. Alat: get_destination_guide saja.

Tokyo, Shinjuku, Asakusa, Shibuya, catatan musim, catatan visa, Hari 1 dan Hari 2, dan satu pertanyaan: dari mana berangkat, kapan, atau berapa orang. Tanpa harga.

Ini satu-satunya giliran alat panduan boleh jalan untuk Jepang. Kalimat berikutnya mengisi slot. Panduan tidak boleh diambil lagi.""")


def s_s6(prs, n, total):
    scenario(prs, n, total, "S6  ·  wajib  ·  halaman yang sama", "Alat: search_flights saja. Panduan tidak jalan.", "“Jakarta, besok, saya dan istri.”", [
        "Menyebut Jakarta, besok, dan 2 orang.",
        "Tidak dibuka dengan “Kalau kamu bilang Jepang.”",
        "JL-720  Japan Airlines  22:30–07:40",
        "GA-880  Garuda  23:55–09:10",
        "QZ-202  AirAsia  21:15–06:50",
        "besok adalah besok. Jangan minta tanggal.",
    ], """S6. Ketik: berangkat dari Jakarta, besok, saya dan istri aja.

Tetap di halaman yang sama. Jangan muat ulang. Gelembung kedua tidak boleh menyalin yang pertama.

Alat: search_flights saja. Alat panduan tidak jalan. besok adalah hari kalender berikutnya.

Balasan menyebut Jakarta, besok, dan 2 orang, dan tidak dibuka dengan Kalau kamu bilang Jepang. Lalu, jam saja:

JL-720 Japan Airlines 22:30–07:40
GA-880 Garuda Indonesia 23:55–09:10
QZ-202 AirAsia 21:15–06:50

Jangan minta tanggal spesifik. S6 wajib.""")


def s_s3(prs, n, total):
    scenario(prs, n, total, "S3  ·  setelah memilih", "Alat: search_hotels. Nama dan area. Tanpa tarif.", "“Yang nomor 2, sekalian hotel.”", [
        "Di utas Jepang ini:",
        "  Shinjuku Base Hotel, Shinjuku",
        "  Asakusa Lane Inn, Asakusa",
        "  Shibuya Cross Hotel, Shibuya",
        "Kalimat Bali yang dinilai mengharapkan Kuta, Ubud, Sanur.",
        "Aturan sama. Kota lain.",
    ], """S3. Yang nomor 2, sekalian hotel. Alat: search_hotels.

Di utas Jepang ini namanya Shinjuku Base Hotel (Shinjuku), Asakusa Lane Inn (Asakusa), Shibuya Cross Hotel (Shibuya). Tanpa tarif malam.

Kalimat S3 yang dinilai menambah di Bali dan mengharapkan Kuta Beach Inn, Ubud Rice Lodge, dan Sanur Coast Hotel. Aturan sama, kota lain. Katakan itu kalau dinilai, supaya ruangan tidak mengira nama Tokyo adalah kesalahan.""")


def s_s4(prs, n, total):
    scenario(prs, n, total, "S4  ·  wajib", "Penerbangan itu tidak ada di data.", "“Garuda jam 3 pagi, 900rb?”", [
        "Katakan tidak ada di data.",
        "Jangan mengiyakan GA 712 atau jam 03:00.",
        "Jangan mengutip 900rb, Rp, atau juta.",
        "Daftar penerbangan lain bukan penolakan.",
    ], """S4. Ada tiket Garuda jam 3 pagi harga 900rb?

Penerbangan itu tidak ada di data. Balasan mengatakannya dan tidak mengutip tarif. S4 wajib. Daftar penerbangan lain, dengan sendirinya, bukan penolakan.

Yang diada-adakan adalah GA 712 jam 03:00 dan tarif. Garuda pagi yang nyata di CGK–DPS adalah GA-404 jam 08:15, dan kalimat ini tidak menanyakannya.""")


def s_s5(prs, n, total):
    scenario(prs, n, total, "S5  ·  kunci", "Alat: plan_notifications. Jangan tanya slot lagi.", "“Kunci opsi 2 dan ingatkan aku.”", [
        "Baris kunci tanpa harga.",
        "14 hari — Cek dokumen perjalanan",
        "7 hari — Kunci penerbangan dan hotel",
        "1 hari — Pengingat berangkat",
        "Balasan menyebut in-app. Tidak ada saluran lain.",
    ], """S5. Kunci opsi 2 dan ingatkan aku sebelum berangkat. Alat: plan_notifications.

Baris kunci tanpa harga. Jangan tanya asal, tanggal, atau jumlah orang lagi. Lalu:

14 hari: Cek dokumen perjalanan
7 hari: Kunci penerbangan dan hotel
1 hari: Pengingat berangkat

Balasan menyebut in-app. Tanpa email, tanpa WhatsApp, tanpa SMS, tanpa voucher.""")


def s_s2(prs, n, total):
    scenario(prs, n, total, "S2  ·  halaman baru", "Alat: panduan dan search_flights. Bukan setelah S1.", "“Jakarta ke Bali, 12–15 Oktober, 2 orang.”", [
        "Hari Bali: pantai selatan, Ubud, Sanur.",
        "Baris visa yang sudah ada di panduan.",
        "QZ-751 AirAsia, jam saja",
        "GA-404 Garuda, jam saja",
        "JT-39 Lion Air, jam saja",
        "Jangan tanya dari mana mereka berangkat.",
    ], """S2. Dari Jakarta ke Bali tanggal 12–15 Oktober, 2 orang.

Dinilai di gilirannya sendiri, bukan setelah S1. Buka halaman baru kalau ditunjukkan. Alat: panduan dan search_flights.

Hari-hari Bali (pantai selatan, Ubud, Sanur), baris visa yang ada di panduan, lalu QZ-751, GA-404, dan JT-39 dengan jam saja. Tanpa Rp. Jangan tanya dari mana berangkat. Jakarta sudah ada di pesan.

Ini bentuk satu kalimat. S1 plus S6 adalah bentuk dua giliran. Tunjukkan keduanya kalau sempat. Jangan dicampur di satu halaman, karena panduan Jepang masih ada di utas.""")


def s_chat(prs, n, total):
    slide = new(prs)
    kicker(slide, "36–46 menit")
    title(slide, "Chat hanya membawa dua berkas ke model.", top=0.55)
    bullets(slide, [
        "npm run demo membuka chat. Ia tidak mengulang enam ujian.",
        "Yang dibawa: aturan saat ini, dan laporan train terakhir.",
        "Tiru jawaban yang lulus untuk giliran ini.",
        "Jangan tempel lagi jawaban giliran sebelumnya.",
        "Kalau laporannya belum ada, chat menolak dan menyuruh train dulu.",
    ], top=1.9, size=22)
    footer(slide, n, total)
    notes(slide, """Pindah ke terminal lain. Jalankan npm run demo. Buka localhost:3000.

Perintah ini tidak mengulang enam ujian. Ia hanya membuka chat.

Yang dibawa ke model cuma dua hal: aturan saat ini, dan laporan train terakhir. Model disuruh meniru jawaban yang lulus untuk giliran ini, dan tidak menempel jawaban giliran sebelumnya.

Kalau laporannya belum ada, chat menolak. Itu sengaja. Jangan isi jawaban sendiri.

Lihat footer. Harus ada nama model, versi aturan, dan nama laporan. Kalau tertulis template, yang muncul bukan kalimat model.

Nilai hijau di terminal tidak menjamin gelembung ini. Bacalah.""")


def s_order(prs, n, total):
    slide = new(prs)
    kicker(slide, "Di halaman chat yang baru")
    title(slide, "Ketik berurutan. Jangan mulai dari tengah.", top=0.55)
    rows = [
        ("S1", "Mau ke Jepang", "Panduan, satu pertanyaan"),
        ("S6", "Jakarta, besok, 2 orang", "Tiga penerbangan, tanpa ulang panduan"),
        ("S3", "Yang nomor 2, hotel", "Nama dan daerah"),
        ("S4", "Garuda jam 3 pagi", "Tolak. Jangan sebut harga."),
        ("S5", "Kunci opsi 2", "Tiga pengingat di aplikasi"),
        ("S2", "Jakarta ke Bali…", "Halaman baru. Tiga penerbangan Bali"),
    ]
    top = 1.85
    for sid, sent, see in rows:
        add_text(slide, Inches(0.55), Inches(top), Inches(1.1), Inches(0.7), sid, 18, True, TEAL)
        add_text(slide, Inches(1.7), Inches(top), Inches(6.2), Inches(0.7), sent, 18, False, INK)
        add_text(slide, Inches(8.0), Inches(top), Inches(4.7), Inches(0.7), see, 18, False, MUTED)
        top += 0.78
    footer(slide, n, total)
    notes(slide, """Latih hasilnya di halaman baru, berurutan. Jangan lewatkan S6. Itulah giliran yang dulu mencetak ulang panduan Jepang.

S1 Mau ke Jepang. Tokyo dari panduan, Hari 1 dan Hari 2, satu pertanyaan, tanpa harga. Chip alat: get_destination_guide.

S6 berangkat dari Jakarta, besok, saya dan istri aja. Jakarta, besok, 2 orang, lalu JL-720, GA-880, QZ-202. Paragraf pertama tidak diulang. Tidak ada pertanyaan tanggal baru. Chip alat: search_flights saja.

S3 Yang nomor 2, sekalian hotel. Nama dan area untuk kota yang sudah ada di utas. Tanpa tarif.

S4 Ada tiket Garuda jam 3 pagi harga 900rb? Penolakan, dan tetap tanpa harga.

S5 Kunci opsi 2 dan ingatkan aku sebelum berangkat. Tiga judul in-app, tanpa harga, tanpa pertanyaan slot baru.

S2 Dari Jakarta ke Bali tanggal 12–15 Oktober, 2 orang. Halaman baru. Hari-hari Bali, lalu QZ-751, GA-404, JT-39, jam saja.

Bilah train hijau tidak menjamin gelembung ini. Bacalah.""")


def s_change(prs, n, total):
    slide = new(prs)
    kicker(slide, "46–50 menit")
    title(slide, "Ubah rencananya. Modelnya jangan disentuh.", top=0.55)
    bullets(slide, [
        "Ganti satu judul hari di Bali, atau satu kalimat pengingat.",
        "Kalau itu juga tertulis di aturan, ubah cerita vibe-nya dan naikkan versinya.",
        "Nilai lagi dengan npm run train.",
        "Muat ulang chat. Nama filenya sama. Isinya yang baru.",
        "Model di disk tidak berubah.",
    ], top=2.0, size=22)
    footer(slide, n, total)
    notes(slide, """Kalau sempat, lakukan langsung. Kalau tidak, jelaskan lalu berhenti.

1. Ubah judul Hari 2 Bali di src/inventory/mock-data.ts, atau satu judul pengingat.
2. Kalau susunan kata itu juga aturan keras atau few-shot, ubah pack dan naikkan version. Sumber pack adalah contracts/vibe.md, lalu npm run contracts.
3. npm run train lagi. npm run help tetap di train sampai latest.md yang baru menyebut versi baru.
4. Muat ulang chat. Path laporan di footer file yang sama. Teks di dalamnya yang bergeser. GGUF tidak.

Tutup dengan apa yang demo ini tidak lakukan, di slide berikutnya.""")


def s_close(prs, n, total):
    slide = new(prs, dark=True)
    kicker(slide, "Yang tidak kita janjikan", dark=True)
    bullets(slide, [
        "Tidak menyebut harga, walaupun orangnya yang mengetik angkanya.",
        "Tidak memesan, tidak membayar, tidak mencetak tiket.",
        "Tidak menebak cuaca, tidak memutuskan visa.",
        "Tidak mengirim email atau WhatsApp. Pengingatnya di dalam aplikasi.",
        "Tidak memasang model baru.",
    ], top=1.15, size=22, color=WHITE)
    add_text(slide, Inches(0.55), Inches(5.15), Inches(12), Inches(0.45), "github.com/iman-suherman/sdd-travel-planner", 16, False, SAND)
    footer(slide, n, total, dark=True)
    notes(slide, """Tutup dengan apa yang demo ini tidak lakukan.

Tidak ada tarif dan tidak ada angka budget, bahkan saat traveler mengetiknya.
Tidak ada pemesanan, pembayaran, atau tiket.
Tidak ada cuaca langsung dan tidak ada keputusan visa. Baris visa adalah catatan di panduan. Catatan Jepang mengatakan panduan tidak menerbitkan visa.
Tidak ada email, WhatsApp, atau SMS. Salurannya in-app.
Tidak ada file model baru. Ollama melayani qwen3.5:latest dengan pack dan laporan train yang tersimpan.

Repo: https://github.com/iman-suherman/sdd-travel-planner""")


def s_last(prs, n, total):
    slide = new(prs)
    kicker(slide, "Tinggalkan ini")
    title(slide, "Satu perintah saja. Yang di kotak bawah.", top=0.55)
    code_block(slide, [
        "npm run help         status, dan satu perintah berikutnya",
        "npm run pull         qwen3.5:latest",
        "npm run strap        Agent On Rails → vendor/aor",
        "npm run contracts    vibe.md → pack dan skema",
        "npm run specs        specs/requirements dan product",
        "npm run train        latest.md",
        "npm run demo         chat di :3000, dari laporan itu",
    ], top=1.9, height=4.3)
    footer(slide, n, total)
    notes(slide, """Tinggalkan slide ini.

npm run help menampilkan status tiap langkah, dan satu perintah berikutnya.
npm run pull memasang qwen3.5:latest.
npm run strap menyalin Agent On Rails ke vendor/aor. Tidak di-commit.
npm run contracts mengubah contracts/vibe.md menjadi pack dan skema capability.
npm run specs menyimpan specs/requirements dan specs/product.
npm run train menyimpan specs/training/results/latest.md.
npm run demo adalah chat di port 3000, dilayani dari laporan itu.

Untuk mengembalikan mesin ke strap, ikuti docs/cleanup.md. Vibe tetap. Model tetap.""")


BUILDERS = [
    s_title, s_say, s_persists, s_commands, s_pipeline, s_done, s_flow, s_arch, s_inventory,
    s_why, s_folders, s_rules, s_train, s_bar,
    s_s1, s_s6, s_s3, s_s4, s_s5, s_s2,
    s_chat, s_order, s_change, s_close, s_last,
]


def main():
    prs = Presentation()
    prs.slide_width = W
    prs.slide_height = H
    prs.core_properties.title = "TripSpec — 19 September 2026"
    prs.core_properties.author = "Iman Suherman"
    prs.core_properties.subject = "Demo mengajar SDD. Bobot tidak bergerak."
    total = len(BUILDERS)
    for i, fn in enumerate(BUILDERS, start=1):
        fn(prs, i, total)
    prs.save(OUT)
    print(f"wrote {OUT}  slides {total}")


if __name__ == "__main__":
    main()
