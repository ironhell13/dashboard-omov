import zipfile
import re
import json
import xml.etree.ElementTree as ET

namespaces = {
    'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
    'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
    'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
    'wp': 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing',
    'pic': 'http://schemas.openxmlformats.org/drawingml/2006/picture',
}

for prefix, uri in namespaces.items():
    ET.register_namespace(prefix, uri)

def replace_drawings_in_cell(cell, slot_key):
    """Ganti semua run yang memiliki w:drawing di dalam cell dengan tag {%foto_<slot_key>}"""
    replaced = False
    for p in cell.findall('.//w:p', namespaces):
        for r in list(p.findall('.//w:r', namespaces)):
            drawings = r.findall('.//w:drawing', namespaces)
            if drawings:
                # Ganti isi run ini menjadi tag docxtemplater
                for child in list(r):
                    r.remove(child)
                t = ET.SubElement(r, '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t')
                t.text = f'{{%foto_{slot_key}}}'
                replaced = True
                break
        if replaced:
            break
            
    # Jika belum ada drawing tapi cell kosong, tambahkan run
    if not replaced:
        p = cell.find('.//w:p', namespaces)
        if p is None:
            p = ET.SubElement(cell, '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p')
        r = ET.SubElement(p, '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}r')
        t = ET.SubElement(r, '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t')
        t.text = f'{{%foto_{slot_key}}}'

def prepare():
    with zipfile.ZipFile('template/BA_SAMPLE.docx', 'r') as zin:
        xml_bytes = zin.read('word/document.xml')
        
    xml_str = xml_bytes.decode('utf-8')
    
    # 1. Hapus semua <w:highlight w:val="yellow"/>
    xml_str = re.sub(r'<w:highlight\s+w:val="[^"]*"\s*/>', '', xml_str)

    # 1.b Gabungkan run yang terpecah seperti 'Z' + '9KD' (SPEC Bagian 11)
    split_z9kd = r'<w:t[^>]*>Z</w:t></w:r><w:r[^>]*>(?:<w:rPr>.*?</w:rPr>)?<w:t[^>]*>9KD</w:t>'
    xml_str = re.sub(split_z9kd, r'<w:t>{wsid}</w:t>', xml_str, flags=re.DOTALL)
    
    # 2. Pemetaan placeholder teks halaman 1, 4, 5
    replacements = [
        # Hal 1 Identitas
        ('SPBU 3415143 Otista', '{lokasi}'),
        ('Z9KD', '{wsid}'),
        ('Jl Oto Iskandardinata No22, Gerendeng, Karawaci, Tangerang', '{alamat}'),
        ('OKI RG8+', '{type_mesin_baru}'),
        ('2605041773', '{serial_nomor}'),
        ('Trade In', '{jenis_pekerjaan}'),
        ('TRADE IN', '{jenis_pekerjaan_upper}'),
        
        # Kelistrikan & Jaringan
        ('219 Volt', '{tegangan_ups_it} Volt'),
        ('000Volt', '{grounding_ups_it} Volt'),
        ('IF2TNGA144', '{initial_vsat}'),
        ('10.176.58.138', '{ip_address}'),
        
        # Penandatangan & Tanggal
        ('12 November 2026', '{tanggal_teks}'),
        ('( Heri H )', '( {yang_melakukan} )'),
        ('( Purwanto )', '( {mengetahui} )'),
        ('( Purwanto)', '( {mengetahui} )'),
        ('Purwanto', '{penandatangan_vendor}'),
        
        # BA Dynabolt Mesin Lama
        ('SR7500-18 / 807497', '{type_mesin_lama} / {sn_mesin_lama}'),
    ]
    
    for old_val, new_val in replacements:
        xml_str = xml_str.replace(old_val, new_val)
        
    tree = ET.fromstring(xml_str.encode('utf-8'))
    
    # 3. Perbaiki tabel 7 yang tertukar di BA Dynabolt:
    tables = tree.findall('.//w:tbl', namespaces)
    if len(tables) >= 7:
        t7 = tables[6]
        rows = t7.findall('.//w:tr', namespaces)
        if len(rows) >= 2:
            for t in rows[0].iterfind('.//w:t', namespaces):
                if t.text == 'Lokasi':
                    t.text = 'WSID'
            for t in rows[1].iterfind('.//w:t', namespaces):
                if t.text == 'WSID':
                    t.text = 'Lokasi'
    
    # 4. Penggantian Gambar dengan Tag {%foto_<key>}
    # Tabel 2: 23 slot foto
    t2 = tables[1]
    t2_slot_mapping = {
        1: ['grounding_pln', 'voltage_pln', 'grounding_ups', 'voltage_ups'],
        3: ['tampak_mesin', 'perangkat_pendukung', 'sudut_kamera', 'jalur_kabel'],
        5: ['stop_kontak', 'mcb', 'sn_mesin', 'sn_kamera'],
        7: ['sn_dvr', 'sn_ups', 'dynabolt', 'kaset_cadangan'],
        9: ['cencon', 'neon_box', 'led_sticker', 'sn_led'],
        10: ['hdd_sebelum', 'hdd_setelah', 'ba_hdd'],
    }
    
    t2_rows = t2.findall('.//w:tr', namespaces)
    for r_idx, slot_keys in t2_slot_mapping.items():
        row = t2_rows[r_idx]
        cells = row.findall('.//w:tc', namespaces)
        for c_idx, slot_key in enumerate(slot_keys):
            cell = cells[c_idx]
            replace_drawings_in_cell(cell, slot_key)

    # Tabel 4: Vendor Hadir (8 slot)
    t4 = tables[3]
    t4_rows = t4.findall('.//w:tr', namespaces)
    t4_mapping = {
        1: ['v_mesin_online', 'v_instalasi', 'v_mover', 'v_cctv'],
        5: ['v_mesin', 'v_pkt1', 'v_pkt2', 'v_nb']
    }
    for r_idx, slot_keys in t4_mapping.items():
        row = t4_rows[r_idx]
        cells = row.findall('.//w:tc', namespaces)
        for c_idx, slot_key in enumerate(slot_keys):
            cell = cells[c_idx]
            replace_drawings_in_cell(cell, slot_key)

    # Tabel 8 & 9: BA Dynabolt (dyn_sebelum, dyn_sesudah)
    t8 = tables[7]
    for cell in t8.iterfind('.//w:tc', namespaces):
        replace_drawings_in_cell(cell, 'dyn_sebelum')

    t9 = tables[8]
    for cell in t9.iterfind('.//w:tc', namespaces):
        replace_drawings_in_cell(cell, 'dyn_sesudah')

    # Halaman 6: Full page BA Destroy HDD
    # Cari drawing berukuran besar (13.18x18.58 cm)
    for p in tree.iterfind('.//w:p', namespaces):
        for r in list(p.findall('.//w:r', namespaces)):
            for d in r.findall('.//w:drawing', namespaces):
                ext = d.find('.//wp:extent', namespaces)
                if ext is not None:
                    cx = int(ext.attrib.get('cx', '0'))
                    cy = int(ext.attrib.get('cy', '0'))
                    # Jika ukuran besar (sekitar 13x18 cm = cx > 4000000)
                    if cx > 4000000:
                        for child in list(r):
                            r.remove(child)
                        t = ET.SubElement(r, '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t')
                        t.text = '{%foto_ba_hdd_full}'
                        print('Slot ba_hdd_full berhasil dipetakan di halaman 6.')

    # Simpan template yang telah dibersihkan
    new_xml = ET.tostring(tree, encoding='utf-8', xml_declaration=True)
    
    with zipfile.ZipFile('template/BA_SAMPLE.docx', 'r') as zin:
        with zipfile.ZipFile('template/BA_TEMPLATE.docx', 'w', compression=zipfile.ZIP_DEFLATED) as zout:
            for item in zin.infolist():
                if item.filename == 'word/document.xml':
                    zout.writestr(item, new_xml)
                else:
                    zout.writestr(item, zin.read(item.filename))
                    
    print('BA_TEMPLATE.docx berhasil dibuat.')

    # 5. Buat Manifes placeholders.json
    manifest = {
        "text_placeholders": [
            "wsid", "lokasi", "alamat", "wsid_lama", "lokasi_lama",
            "type_mesin_baru", "serial_nomor", "jenis_pekerjaan", "jenis_pekerjaan_upper",
            "tegangan_ups_it", "grounding_ups_it", "initial_vsat",
            "konfigurasi", "ip_address", "cartridge", "reject", "kunci",
            "cencon", "kamera", "perekam", "pin_cover", "fdi", "ac",
            "neon_sign", "stiker_mesin", "kabel_jalur", "colokan_listrik",
            "perekam_eksternal_merk", "perekam_eksternal_sn",
            "kamera_eksternal_merk", "kamera_eksternal_sn",
            "ups_merk", "ups_sn", "led_merk", "led_sn",
            "letak_mesin", "tanggal_email_permintaan", "koordinat_text",
            "kota", "tanggal_teks", "yang_melakukan", "mengetahui",
            "type_mesin_lama", "sn_mesin_lama", "keterangan_vendor", "penandatangan_vendor"
        ],
        "photo_placeholders": [
            {"key": "grounding_pln", "tag": "{%foto_grounding_pln}", "width_cm": 4.5, "height_cm": 3.4, "aspect": "4:3"},
            {"key": "voltage_pln", "tag": "{%foto_voltage_pln}", "width_cm": 4.5, "height_cm": 3.4, "aspect": "4:3"},
            {"key": "grounding_ups", "tag": "{%foto_grounding_ups}", "width_cm": 4.5, "height_cm": 3.4, "aspect": "4:3"},
            {"key": "voltage_ups", "tag": "{%foto_voltage_ups}", "width_cm": 4.5, "height_cm": 3.4, "aspect": "4:3"},
            {"key": "tampak_mesin", "tag": "{%foto_tampak_mesin}", "width_cm": 4.5, "height_cm": 3.4, "aspect": "4:3"},
            {"key": "perangkat_pendukung", "tag": "{%foto_perangkat_pendukung}", "width_cm": 4.5, "height_cm": 3.4, "aspect": "4:3"},
            {"key": "sudut_kamera", "tag": "{%foto_sudut_kamera}", "width_cm": 4.5, "height_cm": 3.4, "aspect": "4:3"},
            {"key": "jalur_kabel", "tag": "{%foto_jalur_kabel}", "width_cm": 4.5, "height_cm": 3.4, "aspect": "4:3"},
            {"key": "stop_kontak", "tag": "{%foto_stop_kontak}", "width_cm": 4.5, "height_cm": 3.4, "aspect": "4:3"},
            {"key": "mcb", "tag": "{%foto_mcb}", "width_cm": 4.5, "height_cm": 3.4, "aspect": "4:3"},
            {"key": "sn_mesin", "tag": "{%foto_sn_mesin}", "width_cm": 4.5, "height_cm": 3.4, "aspect": "4:3"},
            {"key": "sn_kamera", "tag": "{%foto_sn_kamera}", "width_cm": 4.5, "height_cm": 3.4, "aspect": "4:3"},
            {"key": "sn_dvr", "tag": "{%foto_sn_dvr}", "width_cm": 4.5, "height_cm": 3.4, "aspect": "4:3"},
            {"key": "sn_ups", "tag": "{%foto_sn_ups}", "width_cm": 4.5, "height_cm": 3.4, "aspect": "4:3"},
            {"key": "dynabolt", "tag": "{%foto_dynabolt}", "width_cm": 4.5, "height_cm": 3.4, "aspect": "4:3"},
            {"key": "kaset_cadangan", "tag": "{%foto_kaset_cadangan}", "width_cm": 4.5, "height_cm": 3.4, "aspect": "4:3"},
            {"key": "cencon", "tag": "{%foto_cencon}", "width_cm": 4.5, "height_cm": 3.4, "aspect": "4:3"},
            {"key": "neon_box", "tag": "{%foto_neon_box}", "width_cm": 4.5, "height_cm": 3.4, "aspect": "4:3"},
            {"key": "led_sticker", "tag": "{%foto_led_sticker}", "width_cm": 4.5, "height_cm": 3.4, "aspect": "4:3"},
            {"key": "sn_led", "tag": "{%foto_sn_led}", "width_cm": 4.5, "height_cm": 3.4, "aspect": "4:3"},
            {"key": "hdd_sebelum", "tag": "{%foto_hdd_sebelum}", "width_cm": 4.5, "height_cm": 3.4, "aspect": "4:3"},
            {"key": "hdd_setelah", "tag": "{%foto_hdd_setelah}", "width_cm": 4.5, "height_cm": 3.4, "aspect": "4:3"},
            {"key": "ba_hdd", "tag": "{%foto_ba_hdd}", "width_cm": 4.5, "height_cm": 3.4, "aspect": "7:10 (mode pas)"},
            {"key": "v_mesin_online", "tag": "{%foto_v_mesin_online}", "width_cm": 4.7, "height_cm": 5.7, "aspect": "5:6"},
            {"key": "v_instalasi", "tag": "{%foto_v_instalasi}", "width_cm": 4.7, "height_cm": 5.7, "aspect": "5:6"},
            {"key": "v_mover", "tag": "{%foto_v_mover}", "width_cm": 4.7, "height_cm": 5.7, "aspect": "5:6"},
            {"key": "v_cctv", "tag": "{%foto_v_cctv}", "width_cm": 4.7, "height_cm": 5.7, "aspect": "5:6"},
            {"key": "v_mesin", "tag": "{%foto_v_mesin}", "width_cm": 4.7, "height_cm": 5.7, "aspect": "5:6"},
            {"key": "v_pkt1", "tag": "{%foto_v_pkt1}", "width_cm": 4.7, "height_cm": 5.7, "aspect": "5:6"},
            {"key": "v_pkt2", "tag": "{%foto_v_pkt2}", "width_cm": 4.7, "height_cm": 5.7, "aspect": "5:6"},
            {"key": "v_nb", "tag": "{%foto_v_nb}", "width_cm": 4.7, "height_cm": 5.7, "aspect": "5:6"},
            {"key": "dyn_sebelum", "tag": "{%foto_dyn_sebelum}", "width_cm": 5.2, "height_cm": 6.5, "aspect": "4:5"},
            {"key": "dyn_sesudah", "tag": "{%foto_dyn_sesudah}", "width_cm": 5.2, "height_cm": 6.5, "aspect": "4:5"},
            {"key": "ba_hdd_full", "tag": "{%foto_ba_hdd_full}", "width_cm": 13.2, "height_cm": 18.6, "aspect": "7:10"}
        ]
    }
    with open('template/placeholders.json', 'w') as f:
        json.dump(manifest, f, indent=2)
    print('placeholders.json berhasil dibuat. Total slot:', len(manifest['photo_placeholders']))

if __name__ == '__main__':
    prepare()
