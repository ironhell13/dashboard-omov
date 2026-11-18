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
                for child in list(r):
                    r.remove(child)
                t = ET.SubElement(r, '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t')
                t.text = f'{{%foto_{slot_key}}}'
                replaced = True
                break
        if replaced:
            break
            
    if not replaced:
        p = cell.find('.//w:p', namespaces)
        if p is None:
            p = ET.SubElement(cell, '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p')
        r = ET.SubElement(p, '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}r')
        t = ET.SubElement(r, '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t')
        t.text = f'{{%foto_{slot_key}}}'

def set_cell_text(cell, text):
    """Set teks sebuah cell menjadi text tertentu sambil menjaga w:tcPr"""
    tcPr = cell.find('w:tcPr', namespaces)
    for child in list(cell):
        if child.tag != '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}tcPr':
            cell.remove(child)
    p = ET.SubElement(cell, '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p')
    r = ET.SubElement(p, '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}r')
    t = ET.SubElement(r, '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t')
    t.text = text

def set_p_text(p, text):
    """Set teks sebuah paragraph sambil menjaga w:pPr"""
    pPr = p.find('w:pPr', namespaces)
    for child in list(p):
        if child.tag != '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}pPr':
            p.remove(child)
    r = ET.SubElement(p, '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}r')
    t = ET.SubElement(r, '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t')
    t.text = text

def get_p_text(p):
    return ''.join([t.text for t in p.findall('.//w:t', namespaces) if t.text])

def rebuild():
    with zipfile.ZipFile('BA_SAMPLE.docx', 'r') as zin:
        xml_bytes = zin.read('word/document.xml')
        
    xml_str = xml_bytes.decode('utf-8')
    # 1. Hapus highlight yellow
    xml_str = re.sub(r'<w:highlight\s+w:val="[^"]*"\s*/>', '', xml_str)
    
    tree = ET.fromstring(xml_str.encode('utf-8'))
    
    # 2. Proses Paragraphs
    paragraphs = tree.findall('.//w:p', namespaces)
    for idx, p in enumerate(paragraphs):
        txt = get_p_text(p).strip()
        if not txt:
            continue
            
        if 'Pada hari' in txt and 'telah dilakukan Instalasi' in txt:
            set_p_text(p, 'Pada hari {hari} ,{tanggal_teks} telah dilakukan Instalasi mesin ATM BCA dengan data sebagai berikut:')
        elif txt.startswith('Lokasi:') and 'WSID:' in txt:
            set_p_text(p, 'Lokasi: {lokasi}    WSID: {wsid}')
        elif txt.startswith('Alamat:'):
            set_p_text(p, 'Alamat: {alamat}')
        elif txt.startswith('Lokasi Lama:'):
            set_p_text(p, 'Lokasi Lama: {lokasi_lama}')
        elif txt.startswith('WSID Lama:'):
            set_p_text(p, 'WSID Lama: {wsid_lama}')
        elif txt.startswith('Type Mesin:'):
            set_p_text(p, 'Type Mesin: {type_mesin_baru}')
        elif txt.startswith('Serial Nomor'):
            set_p_text(p, 'Serial Nomor                       : {serial_nomor}')
        elif txt.startswith('Baru/Relokasi:') and 'Tegangan Listrik' in txt:
            set_p_text(p, 'Baru/Relokasi: {jenis_pekerjaan}    Tegangan Listrik (UPS-IT): {tegangan_ups_it} Volt    Grounding (UPS-IT): {grounding_ups_it} Volt')
        elif txt.startswith('Initial VSAT:'):
            set_p_text(p, 'Initial VSAT: {initial_vsat}')
        elif txt.startswith('Konfigurasi:'):
            set_p_text(p, 'Konfigurasi: {konfigurasi}')
        elif txt.startswith('IP Address:'):
            set_p_text(p, 'IP Address: {ip_address}')
        elif txt.startswith('Catridge:') and 'Reject:' in txt:
            set_p_text(p, 'Catridge:  {cartridge}    Reject: {reject}    Kunci: {kunci}')
        elif txt.startswith('Cencon:'):
            set_p_text(p, 'Cencon: {cencon}')
        elif txt.startswith('Kamera:') and 'Internal' in txt:
            set_p_text(p, 'Kamera: {kamera}')
        elif txt.startswith('Perekam:') and 'Internal' in txt:
            set_p_text(p, 'Perekam: {perekam}')
        elif 'PIN' in txt and 'Cover:' in txt:
            set_p_text(p, 'PIN Cover: {pin_cover}')
        elif txt.startswith('FDI:'):
            set_p_text(p, 'FDI: {fdi}')
        elif 'MasterKey' in txt:
            set_p_text(p, 'MasterKey Triple desk: {masterkey_triple_des}')
        elif txt.startswith('AC:'):
            set_p_text(p, 'AC: {ac}')
        elif 'Neon Sign:' in txt:
            set_p_text(p, 'Outdoor: -Neon Sign: {neon_sign}')
        elif 'Stiker Mesin:' in txt:
            set_p_text(p, ': -Stiker Mesin: {stiker_mesin}')
        elif 'Kabel Jalur:' in txt:
            set_p_text(p, 'Indoor: -Kabel Jalur: {kabel_jalur}')
        elif 'Colokan Listrik:' in txt:
            set_p_text(p, 'Colokan Listrik: {colokan_listrik}')
        elif 'Perekam Eksternal' in txt:
            set_p_text(p, 'Perekam Eksternal : {perekam_eksternal_status} - Merk: {perekam_eksternal_merk} SN : {perekam_eksternal_sn}')
        elif 'Kamera Eksternal' in txt:
            set_p_text(p, 'Kamera Eksternal : {kamera_eksternal_status} - Merk: {kamera_eksternal_merk} SN: {kamera_eksternal_sn}')
        elif txt.startswith('UPS:') and 'Merk:' in txt:
            set_p_text(p, 'UPS: {ups_status} - Merk: {ups_merk} SN: {ups_sn}')
        elif txt.startswith('LED') and 'Merk:' in txt:
            set_p_text(p, 'LED                     : {led_status}  - Merk: {led_merk}                    SN: {led_sn}')
        elif 'Letak Mesin:' in txt:
            set_p_text(p, 'Letak Mesin: {letak_mesin}')
        elif 'Pasang Pengaman Angkur' in txt:
            set_p_text(p, 'Pasang Pengaman Angkur  : {angkur} (jika “YA” harap tuliskan nama vendor) : {angkur_vendor}')
        elif 'pengaman pengganti' in txt:
            set_p_text(p, 'Jika “Tidak” harap info type pengaman pengganti :  {pengaman_pengganti} Harap info alasan menggunakan Dynabold/Alarm : {angkur_alasan}')
        elif 'Pasang Supersite:' in txt:
            set_p_text(p, 'Pasang Supersite: {supersite} (Khusus Jabodetabek, jika “Ya” harap tuliskan nama vendor: {supersite_vendor}')
        elif 'Exhaust Fan' in txt:
            set_p_text(p, ': Exhaust Fan : {exhaust_fan_text}  Jika Tidak pasang supersite mohon alasannya : {supersite_alasan}')
        elif 'Tanggal Email Permintaan Mesin' in txt:
            set_p_text(p, 'Tanggal Email Permintaan Mesin : {tanggal_email_permintaan}')
        elif 'Koordinat:' in txt:
            set_p_text(p, 'Koordinat: {koordinat_text}')
        elif re.search(r'^[A-Za-z\s]+,\s*\d+\s+[A-Za-z]+\s+\d{4}$', txt) and idx < 50:
            set_p_text(p, '{kota}, {tanggal_teks}')
        elif 'Pada hari' in txt and 'pemasangan pengamanan mesin yaitu dynabolt' in txt:
            set_p_text(p, 'Pada hari {hari}, {tanggal_teks} telah dilakukan pemasangan pengamanan mesin yaitu dynabolt dengan data sbb :')

    # 3. Tables
    tables = tree.findall('.//w:tbl', namespaces)
    
    # Table 0: Signature Hal 1
    t0 = tables[0]
    t0_r1_cells = t0.findall('.//w:tr', namespaces)[1].findall('.//w:tc', namespaces)
    set_cell_text(t0_r1_cells[0], '( {yang_melakukan} )')
    set_cell_text(t0_r1_cells[1], '( {mengetahui} )')
    
    # Table 1: Foto 23 Slot
    t1 = tables[1]
    t1_slot_mapping = {
        1: ['grounding_pln', 'voltage_pln', 'grounding_ups', 'voltage_ups'],
        3: ['tampak_mesin', 'perangkat_pendukung', 'sudut_kamera', 'jalur_kabel'],
        5: ['stop_kontak', 'mcb', 'sn_mesin', 'sn_kamera'],
        7: ['sn_dvr', 'sn_ups', 'dynabolt', 'kaset_cadangan'],
        9: ['cencon', 'neon_box', 'led_sticker', 'sn_led'],
        10: ['hdd_sebelum', 'hdd_setelah', 'ba_hdd'],
    }
    t1_rows = t1.findall('.//w:tr', namespaces)
    for r_idx, slot_keys in t1_slot_mapping.items():
        row = t1_rows[r_idx]
        cells = row.findall('.//w:tc', namespaces)
        for c_idx, slot_key in enumerate(slot_keys):
            cell = cells[c_idx]
            replace_drawings_in_cell(cell, slot_key)
            
    # Table 2: Header Vendor Hadir Hal 4
    t2 = tables[2]
    t2_rows = t2.findall('.//w:tr', namespaces)
    set_cell_text(t2_rows[1].findall('.//w:tc', namespaces)[2], '{wsid}')
    set_cell_text(t2_rows[2].findall('.//w:tc', namespaces)[2], '{lokasi}')
    set_cell_text(t2_rows[3].findall('.//w:tc', namespaces)[2], '{alamat}')
    set_cell_text(t2_rows[4].findall('.//w:tc', namespaces)[2], '{jenis_pekerjaan_upper}')
    set_cell_text(t2_rows[5].findall('.//w:tc', namespaces)[2], '{jadwal_aktivasi}')
    
    # Table 3: Vendor Hadir Hal 4 (Photos, Names, Times)
    t3 = tables[3]
    t3_rows = t3.findall('.//w:tr', namespaces)
    # Row 1: Photos
    t3_p_map_1 = ['v_mesin_online', 'v_instalasi', 'v_mover', 'v_cctv']
    for c_idx, k in enumerate(t3_p_map_1):
        replace_drawings_in_cell(t3_rows[1].findall('.//w:tc', namespaces)[c_idx], k)
    # Row 2: Vendor Names
    cells_r2 = t3_rows[2].findall('.//w:tc', namespaces)
    set_cell_text(cells_r2[0], '{v_mesin_online_nama}')
    set_cell_text(cells_r2[1], '{v_vendor_instalasi_nama}')
    set_cell_text(cells_r2[2], '{v_vendor_mover_nama}')
    set_cell_text(cells_r2[3], '{v_vendor_cctv_nama}')
    # Row 3: Vendor Times
    cells_r3 = t3_rows[3].findall('.//w:tc', namespaces)
    set_cell_text(cells_r3[0], '{v_mesin_online_waktu}')
    set_cell_text(cells_r3[1], '{v_vendor_instalasi_waktu}')
    set_cell_text(cells_r3[2], '{v_vendor_mover_waktu}')
    set_cell_text(cells_r3[3], '{v_vendor_cctv_waktu}')
    # Row 5: Photos
    t3_p_map_2 = ['v_mesin', 'v_pkt1', 'v_pkt2', 'v_nb']
    for c_idx, k in enumerate(t3_p_map_2):
        replace_drawings_in_cell(t3_rows[5].findall('.//w:tc', namespaces)[c_idx], k)
    # Row 6: Vendor Names
    cells_r6 = t3_rows[6].findall('.//w:tc', namespaces)
    set_cell_text(cells_r6[0], '{v_vendor_mesin_nama}')
    set_cell_text(cells_r6[1], '{v_pkt1_nama}')
    set_cell_text(cells_r6[2], '{v_pkt2_nama}')
    set_cell_text(cells_r6[3], '{v_vendor_nb_nama}')
    # Row 7: Vendor Times
    cells_r7 = t3_rows[7].findall('.//w:tc', namespaces)
    set_cell_text(cells_r7[0], '{v_vendor_mesin_waktu}')
    set_cell_text(cells_r7[1], '{v_pkt1_waktu}')
    set_cell_text(cells_r7[2], '{v_pkt2_waktu}')
    set_cell_text(cells_r7[3], '{v_vendor_nb_waktu}')
    
    # Table 4: Keterangan Hal 4
    t4 = tables[4]
    t4_cell = t4.findall('.//w:tr', namespaces)[0].findall('.//w:tc', namespaces)[0]
    set_cell_text(t4_cell, 'Keterangan : {keterangan_vendor}')
    
    # Table 5: Signature Hal 4
    t5 = tables[5]
    t5_rows = t5.findall('.//w:tr', namespaces)
    set_cell_text(t5_rows[1].findall('.//w:tc', namespaces)[0], '{kota}, {tanggal_teks}')
    set_cell_text(t5_rows[2].findall('.//w:tc', namespaces)[0], '{penandatangan_vendor}')
    
    # Table 6: Info Dynabolt Hal 5 (perbaiki juga label tertukar)
    t6 = tables[6]
    t6_rows = t6.findall('.//w:tr', namespaces)
    # Row 0: WSID
    set_cell_text(t6_rows[0].findall('.//w:tc', namespaces)[0], 'WSID')
    set_cell_text(t6_rows[0].findall('.//w:tc', namespaces)[2], '{wsid}')
    # Row 1: Lokasi
    set_cell_text(t6_rows[1].findall('.//w:tc', namespaces)[0], 'Lokasi')
    set_cell_text(t6_rows[1].findall('.//w:tc', namespaces)[2], '{lokasi}')
    # Row 2: Alamat
    set_cell_text(t6_rows[2].findall('.//w:tc', namespaces)[2], '{alamat}')
    # Row 3: Type Mesin / SN
    set_cell_text(t6_rows[3].findall('.//w:tc', namespaces)[2], '{type_mesin_lama} / {sn_mesin_lama}')
    
    # Table 7: Foto Dynabolt Sebelum
    t7 = tables[7]
    for cell in t7.iterfind('.//w:tc', namespaces):
        replace_drawings_in_cell(cell, 'dyn_sebelum')
        
    # Table 8: Foto Dynabolt Sesudah
    t8 = tables[8]
    for cell in t8.iterfind('.//w:tc', namespaces):
        replace_drawings_in_cell(cell, 'dyn_sesudah')
        
    # Table 9: Signature Dynabolt Hal 5
    t9 = tables[9]
    t9_r2_cells = t9.findall('.//w:tr', namespaces)[2].findall('.//w:tc', namespaces)
    set_cell_text(t9_r2_cells[0], '( {yang_melakukan} )')
    set_cell_text(t9_r2_cells[1], '( {mengetahui} )')
    
    # Halaman 5 Tanggal Dynabolt (cari paragraph dengan Jakarta, 12 November setelah tabel 8)
    for p in paragraphs[190:]:
        txt = get_p_text(p).strip()
        if 'Jakarta,' in txt and '2026' in txt:
            set_p_text(p, '     {kota}, {tanggal_teks}')
            break
            
    # Halaman 6: Full page BA Destroy HDD
    for p in tree.iterfind('.//w:p', namespaces):
        for r in list(p.findall('.//w:r', namespaces)):
            for d in r.findall('.//w:drawing', namespaces):
                ext = d.find('.//wp:extent', namespaces)
                if ext is not None:
                    cx = int(ext.attrib.get('cx', '0'))
                    if cx > 4000000:
                        for child in list(r):
                            r.remove(child)
                        t = ET.SubElement(r, '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t')
                        t.text = '{%foto_ba_hdd_full}'
                        print('ba_hdd_full mapped on Hal 6')

    # Save to template/BA_TEMPLATE.docx
    new_xml = ET.tostring(tree, encoding='utf-8', xml_declaration=True)
    with zipfile.ZipFile('BA_SAMPLE.docx', 'r') as zin:
        with zipfile.ZipFile('template/BA_TEMPLATE.docx', 'w', compression=zipfile.ZIP_DEFLATED) as zout:
            for item in zin.infolist():
                if item.filename == 'word/document.xml':
                    zout.writestr(item, new_xml)
                else:
                    zout.writestr(item, zin.read(item.filename))
                    
    print('BA_TEMPLATE.docx successfully rebuilt!')

if __name__ == '__main__':
    rebuild()
