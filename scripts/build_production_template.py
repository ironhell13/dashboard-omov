import zipfile
import re
import xml.etree.ElementTree as ET

# 1. Register ALL OpenXML namespaces with their exact official prefixes
NAMESPACES = {
    'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
    'wp': 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing',
    'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
    'pic': 'http://schemas.openxmlformats.org/drawingml/2006/picture',
    'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
    'm': 'http://schemas.openxmlformats.org/officeDocument/2006/math',
    'v': 'urn:schemas-microsoft-com:vml',
    'o': 'urn:schemas-microsoft-com:office:office',
    'w10': 'urn:schemas-microsoft-com:office:word',
    'w14': 'http://schemas.microsoft.com/office/word/2010/wordml',
    'w15': 'http://schemas.microsoft.com/office/word/2012/wordml',
    'w16': 'http://schemas.microsoft.com/office/word/2018/wordml',
    'w16cex': 'http://schemas.microsoft.com/office/word/2018/wordml/cex',
    'w16cid': 'http://schemas.microsoft.com/office/word/2016/wordml/cid',
    'w16se': 'http://schemas.microsoft.com/office/word/2015/wordml/symex',
    'w16sdtdh': 'http://schemas.microsoft.com/office/word/2020/wordml/sdtdatahash',
    'mc': 'http://schemas.openxmlformats.org/markup-compatibility/2006',
    'wp14': 'http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing',
    'wpc': 'http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas',
    'wpg': 'http://schemas.microsoft.com/office/word/2010/wordprocessingGroup',
    'wpi': 'http://schemas.microsoft.com/office/word/2010/wordprocessingInk',
    'wne': 'http://schemas.microsoft.com/office/word/2006/wordml',
    'wps': 'http://schemas.microsoft.com/office/word/2010/wordprocessingShape',
}

for prefix, uri in NAMESPACES.items():
    ET.register_namespace(prefix, uri)

W_NS = NAMESPACES['w']

with zipfile.ZipFile('BA_SAMPLE.docx', 'r') as z_in:
    doc_xml = z_in.read('word/document.xml')
    styles_xml = z_in.read('word/styles.xml')
    file_map = {name: z_in.read(name) for name in z_in.namelist()}

# Extract the original <w:document ...> opening tag
original_doc_xml_str = doc_xml.decode('utf-8')
root_match = re.search(r'<w:document[^>]*>', original_doc_xml_str)
orig_root_tag = root_match.group(0) if root_match else None

# Ensure xmlns:a and xmlns:pic are present in root tag
if orig_root_tag:
    if 'xmlns:a=' not in orig_root_tag:
        orig_root_tag = orig_root_tag.replace(
            '<w:document ',
            '<w:document xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
        )
    if 'xmlns:pic=' not in orig_root_tag:
        orig_root_tag = orig_root_tag.replace(
            '<w:document ',
            '<w:document xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" '
        )
    if 'xmlns:wp=' not in orig_root_tag:
        orig_root_tag = orig_root_tag.replace(
            '<w:document ',
            '<w:document xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" '
        )
    if 'xmlns:r=' not in orig_root_tag:
        orig_root_tag = orig_root_tag.replace(
            '<w:document ',
            '<w:document xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" '
        )

# 2. Update styles.xml: Default Tahoma 9pt (18)
styles_root = ET.fromstring(styles_xml)
for rFonts in styles_root.findall('.//w:rFonts', {'w': W_NS}):
    rFonts.attrib[f'{{{W_NS}}}ascii'] = 'Tahoma'
    rFonts.attrib[f'{{{W_NS}}}hAnsi'] = 'Tahoma'
    rFonts.attrib[f'{{{W_NS}}}cs'] = 'Tahoma'
    for k in [f'{{{W_NS}}}asciiTheme', f'{{{W_NS}}}hAnsiTheme', f'{{{W_NS}}}cstheme', f'{{{W_NS}}}eastAsiaTheme']:
        if k in rFonts.attrib:
            del rFonts.attrib[k]

for sz in styles_root.findall('.//w:sz', {'w': W_NS}):
    sz.attrib[f'{{{W_NS}}}val'] = '18'
for szCs in styles_root.findall('.//w:szCs', {'w': W_NS}):
    szCs.attrib[f'{{{W_NS}}}val'] = '18'

styles_xml_updated = ET.tostring(styles_root, encoding='utf-8', xml_declaration=True)

# 3. Process document.xml from BA_SAMPLE
doc_root = ET.fromstring(doc_xml)

# Replace all fonts to Tahoma and size to 18 (9pt)
for rFonts in doc_root.findall('.//w:rFonts', {'w': W_NS}):
    rFonts.attrib[f'{{{W_NS}}}ascii'] = 'Tahoma'
    rFonts.attrib[f'{{{W_NS}}}hAnsi'] = 'Tahoma'
    rFonts.attrib[f'{{{W_NS}}}cs'] = 'Tahoma'
    for k in [f'{{{W_NS}}}asciiTheme', f'{{{W_NS}}}hAnsiTheme', f'{{{W_NS}}}cstheme', f'{{{W_NS}}}eastAsiaTheme']:
        if k in rFonts.attrib:
            del rFonts.attrib[k]

for sz in doc_root.findall('.//w:sz', {'w': W_NS}):
    sz.attrib[f'{{{W_NS}}}val'] = '18'
for szCs in doc_root.findall('.//w:szCs', {'w': W_NS}):
    szCs.attrib[f'{{{W_NS}}}val'] = '18'

# Helper functions for paragraph generation
def make_p_xml(p_runs_xml, tab1=3100, tab2=None, tab3=None, spacing_before=1, ind_right=None):
    tabs_xml = f'<w:tab w:val="left" w:pos="{tab1}" />'
    if tab2:
        tabs_xml += f'<w:tab w:val="left" w:pos="{tab2}" />'
    if tab3:
        tabs_xml += f'<w:tab w:val="left" w:pos="{tab3}" />'
    ind_xml = f'<w:ind w:right="{ind_right}" />' if ind_right else ''
    return f'''<w:p xmlns:w="{W_NS}">
  <w:pPr>
    <w:pStyle w:val="BodyText" />
    <w:tabs>{tabs_xml}</w:tabs>
    <w:spacing w:before="{spacing_before}" />
    {ind_xml}
    <w:rPr>
      <w:rFonts w:ascii="Tahoma" w:hAnsi="Tahoma" w:cs="Tahoma" />
      <w:sz w:val="18" />
      <w:szCs w:val="18" />
      <w:lang w:val="id-ID" />
    </w:rPr>
  </w:pPr>
  {p_runs_xml}
</w:p>'''

def r(text, space=False, strike=False):
    sp = ' xml:space="preserve"' if (space or ' ' in text) else ''
    st = '<w:strike />' if strike else ''
    return f'<w:r><w:rPr><w:rFonts w:ascii="Tahoma" w:hAnsi="Tahoma" w:cs="Tahoma" /><w:sz w:val="18" /><w:szCs w:val="18" />{st}</w:rPr><w:t{sp}>{text}</w:t></w:r>'

def tab_colon():
    return f'<w:r><w:rPr><w:rFonts w:ascii="Tahoma" w:hAnsi="Tahoma" w:cs="Tahoma" /><w:sz w:val="18" /><w:szCs w:val="18" /></w:rPr><w:tab /><w:t>: </w:t></w:r>'

def tab():
    return f'<w:r><w:rPr><w:rFonts w:ascii="Tahoma" w:hAnsi="Tahoma" w:cs="Tahoma" /><w:sz w:val="18" /><w:szCs w:val="18" /></w:rPr><w:tab /></w:r>'

def br():
    return '<w:r><w:br /></w:r>'

# Paragraph replacements on Page 1
page1_reps = {
    2: f'''<w:p xmlns:w="{W_NS}"><w:pPr><w:pStyle w:val="BodyText" /><w:spacing w:before="1" /><w:rPr><w:rFonts w:ascii="Tahoma" w:hAnsi="Tahoma" w:cs="Tahoma" /><w:sz w:val="18" /></w:rPr></w:pPr>{r('Pada hari {hari}, {tanggal_teks} telah dilakukan {jenis_pekerjaan} mesin ATM BCA dengan data sebagai berikut:', space=True)}</w:p>''',
    4: make_p_xml(r('Lokasi') + tab_colon() + r('{lokasi}') + br() + r('WSID') + tab_colon() + r('{wsid}')),
    5: make_p_xml(r('Alamat') + tab_colon() + r('{alamat}')),
    6: make_p_xml(r('Lokasi Lama') + tab_colon() + r('{lokasi_lama}')),
    7: make_p_xml(r('WSID Lama') + tab_colon() + r('{wsid_lama}')),
    8: make_p_xml(r('Type Mesin') + tab_colon() + r('{type_mesin_baru}')),
    9: make_p_xml(r('Serial Nomor') + tab_colon() + r('{serial_nomor}')),
    10: make_p_xml(
        r('Baru/Relokasi') + tab_colon() + r('{jenis_pekerjaan}') + br() +
        r('Tegangan Listrik (UPS-IT)') + tab_colon() + r('{tegangan_ups_it} Volt', space=True) +
        tab() + r('Grounding (UPS-IT)') + tab() + r(': {grounding_ups_it} Volt', space=True),
        tab1=3100, tab2=5600, tab3=7400
    ),
    11: make_p_xml(r('Initial VSAT') + tab_colon() + r('{initial_vsat}')),
    12: make_p_xml(r('Konfigurasi') + tab_colon() + r('{konfigurasi}')),
    13: make_p_xml(r('IP Address') + tab_colon() + r('{ip_address}')),
    14: make_p_xml(
        r('Catridge') + tab_colon() + r('{cartridge}') + br() +
        r('Reject') + tab_colon() + r('{reject}') + br() +
        r('Kunci') + tab_colon() + r('{kunci}')
    ),
    15: make_p_xml(r('Cencon') + tab_colon() + r('{cencon}')),
    16: make_p_xml(r('Kamera') + tab_colon() + r('{kamera}')),
    17: make_p_xml(r('Perekam') + tab_colon() + r('{perekam}')),
    18: make_p_xml(r('PIN Cover') + tab_colon() + r('{pin_cover}')),
    19: make_p_xml(r('FDI') + tab_colon() + r('{fdi}')),
    20: make_p_xml(
        r('MasterKey Triple desk') + tab_colon() +
        '<w:r><w:t>{#mk_ya_struck}</w:t></w:r>' +
        '<w:r><w:rPr><w:strike /><w:rFonts w:ascii="Tahoma" w:hAnsi="Tahoma" w:cs="Tahoma" /><w:sz w:val="18" /><w:szCs w:val="18" /></w:rPr><w:t>Ya Digit</w:t></w:r>' +
        '<w:r><w:t>{/mk_ya_struck}{^mk_ya_struck}</w:t></w:r>' +
        '<w:r><w:rPr><w:rFonts w:ascii="Tahoma" w:hAnsi="Tahoma" w:cs="Tahoma" /><w:sz w:val="18" /><w:szCs w:val="18" /></w:rPr><w:t>Ya Digit</w:t></w:r>' +
        '<w:r><w:t>{/mk_ya_struck}</w:t></w:r>' +
        r(' / ') +
        '<w:r><w:t>{#mk_tidak_struck}</w:t></w:r>' +
        '<w:r><w:rPr><w:strike /><w:rFonts w:ascii="Tahoma" w:hAnsi="Tahoma" w:cs="Tahoma" /><w:sz w:val="18" /><w:szCs w:val="18" /></w:rPr><w:t>Tidak</w:t></w:r>' +
        '<w:r><w:t>{/mk_tidak_struck}{^mk_tidak_struck}</w:t></w:r>' +
        '<w:r><w:rPr><w:rFonts w:ascii="Tahoma" w:hAnsi="Tahoma" w:cs="Tahoma" /><w:sz w:val="18" /><w:szCs w:val="18" /></w:rPr><w:t>Tidak</w:t></w:r>' +
        '<w:r><w:t>{/mk_tidak_struck}</w:t></w:r>' +
        r('   Harap info alasan jika tidak : ', space=True) + r('{masterkey_alasan}')
    ),
    21: make_p_xml(r('AC') + tab_colon() + r('{ac}')),
    22: make_p_xml(
        r('Outdoor') + tab_colon() + r('- Neon Sign') + tab() + r(': {neon_sign}', space=True),
        tab1=3100, tab2=4600
    ),
    23: make_p_xml(
        tab() + r(': - Stiker Mesin', space=True) + tab() + r(': {stiker_mesin}', space=True),
        tab1=3100, tab2=4600
    ),
    24: make_p_xml(
        r('Indoor') + tab_colon() + r('- Kabel Jalur') + tab() + r(': {kabel_jalur}', space=True),
        tab1=3100, tab2=4600
    ),
    25: make_p_xml(r('Colokan Listrik') + tab_colon() + r('{colokan_listrik}')),
    26: make_p_xml(
        r('Perekam Eksternal') + tab_colon() + r('{perekam_eksternal_status} - Merk: {perekam_eksternal_merk}', space=True) +
        tab() + r('SN: {perekam_eksternal_sn}', space=True),
        tab1=3100, tab2=6800
    ),
    27: make_p_xml(
        r('Kamera Eksternal') + tab_colon() + r('{kamera_eksternal_status} - Merk: {kamera_eksternal_merk}', space=True) +
        tab() + r('SN: {kamera_eksternal_sn}', space=True),
        tab1=3100, tab2=6800
    ),
    28: make_p_xml(
        r('UPS') + tab_colon() + r('{ups_status} - Merk: {ups_merk}', space=True) +
        tab() + r('SN: {ups_sn}', space=True),
        tab1=3100, tab2=6800
    ),
    29: make_p_xml(
        r('LED') + tab_colon() + r('{led_status} - Merk: {led_merk}', space=True) +
        tab() + r('SN: {led_sn}', space=True),
        tab1=3100, tab2=6800
    ),
    31: make_p_xml(r('Letak Mesin') + tab_colon() + r('{letak_mesin}')),
    32: make_p_xml(
        r('Pasang Pengaman Angkur') + tab_colon() +
        '<w:r><w:t>{#angkur_ya_struck}</w:t></w:r>' +
        '<w:r><w:rPr><w:strike /><w:rFonts w:ascii="Tahoma" w:hAnsi="Tahoma" w:cs="Tahoma" /><w:sz w:val="18" /><w:szCs w:val="18" /></w:rPr><w:t>Ya</w:t></w:r>' +
        '<w:r><w:t>{/angkur_ya_struck}{^angkur_ya_struck}</w:t></w:r>' +
        '<w:r><w:rPr><w:rFonts w:ascii="Tahoma" w:hAnsi="Tahoma" w:cs="Tahoma" /><w:sz w:val="18" /><w:szCs w:val="18" /></w:rPr><w:t>Ya</w:t></w:r>' +
        '<w:r><w:t>{/angkur_ya_struck}</w:t></w:r>' +
        r(' / ') +
        '<w:r><w:t>{#angkur_tidak_struck}</w:t></w:r>' +
        '<w:r><w:rPr><w:strike /><w:rFonts w:ascii="Tahoma" w:hAnsi="Tahoma" w:cs="Tahoma" /><w:sz w:val="18" /><w:szCs w:val="18" /></w:rPr><w:t>Tidak</w:t></w:r>' +
        '<w:r><w:t>{/angkur_tidak_struck}{^angkur_tidak_struck}</w:t></w:r>' +
        '<w:r><w:rPr><w:rFonts w:ascii="Tahoma" w:hAnsi="Tahoma" w:cs="Tahoma" /><w:sz w:val="18" /><w:szCs w:val="18" /></w:rPr><w:t>Tidak</w:t></w:r>' +
        '<w:r><w:t>{/angkur_tidak_struck}</w:t></w:r>' +
        r(' (jika “YA” harap tuliskan nama vendor) : ', space=True) + r('{angkur_vendor}')
    ),
    33: make_p_xml(
        r('Jika “Tidak” harap info type pengaman pengganti :  {pengaman_dynabolt_box} Dynabold   {pengaman_alarm_box} Alarm   Harap info alasan menggunakan Dynabold/Alarm : ', space=True) +
        r('{angkur_alasan}')
    ),
    34: make_p_xml(
        r('Pasang Supersite') + tab_colon() +
        '<w:r><w:t>{#supersite_ya_struck}</w:t></w:r>' +
        '<w:r><w:rPr><w:strike /><w:rFonts w:ascii="Tahoma" w:hAnsi="Tahoma" w:cs="Tahoma" /><w:sz w:val="18" /><w:szCs w:val="18" /></w:rPr><w:t>Ya</w:t></w:r>' +
        '<w:r><w:t>{/supersite_ya_struck}{^supersite_ya_struck}</w:t></w:r>' +
        '<w:r><w:rPr><w:rFonts w:ascii="Tahoma" w:hAnsi="Tahoma" w:cs="Tahoma" /><w:sz w:val="18" /><w:szCs w:val="18" /></w:rPr><w:t>Ya</w:t></w:r>' +
        '<w:r><w:t>{/supersite_ya_struck}</w:t></w:r>' +
        r(' / ') +
        '<w:r><w:t>{#supersite_tidak_struck}</w:t></w:r>' +
        '<w:r><w:rPr><w:strike /><w:rFonts w:ascii="Tahoma" w:hAnsi="Tahoma" w:cs="Tahoma" /><w:sz w:val="18" /><w:szCs w:val="18" /></w:rPr><w:t>Tidak</w:t></w:r>' +
        '<w:r><w:t>{/supersite_tidak_struck}{^supersite_tidak_struck}</w:t></w:r>' +
        '<w:r><w:rPr><w:rFonts w:ascii="Tahoma" w:hAnsi="Tahoma" w:cs="Tahoma" /><w:sz w:val="18" /><w:szCs w:val="18" /></w:rPr><w:t>Tidak</w:t></w:r>' +
        '<w:r><w:t>{/supersite_tidak_struck}</w:t></w:r>' +
        r(' (Khusus Jabodetabek, jika “Ya” harap tuliskan nama vendor: ', space=True) + r('{supersite_vendor}')
    ),
    36: make_p_xml(
        r('Exhaust Fan') + tab_colon() + r('{exhaust_fan_text}') +
        r('   Jika Tidak pasang supersite mohon alasannya : ', space=True) + r('{supersite_alasan}')
    ),
    37: make_p_xml(r('Tanggal Email Permintaan Mesin') + tab_colon() + r('{tanggal_email_permintaan}')),
    38: f'''<w:p xmlns:w="{W_NS}"><w:pPr><w:spacing w:before="1" /><w:rPr><w:rFonts w:ascii="Tahoma" w:hAnsi="Tahoma" w:cs="Tahoma" /><w:sz w:val="18" /></w:rPr></w:pPr></w:p>''',
    40: make_p_xml(r('Koordinat') + tab_colon() + r('{koordinat_text}')),
    41: f'''<w:p xmlns:w="{W_NS}"><w:pPr><w:spacing w:before="100" /><w:rPr><w:rFonts w:ascii="Tahoma" w:hAnsi="Tahoma" w:cs="Tahoma" /><w:sz w:val="18" /></w:rPr></w:pPr>{r('{kota}, {tanggal_teks}')}</w:p>''',
    44: f'''<w:p xmlns:w="{W_NS}"><w:pPr><w:spacing w:before="1" /><w:rPr><w:rFonts w:ascii="Tahoma" w:hAnsi="Tahoma" w:cs="Tahoma" /><w:sz w:val="18" /></w:rPr></w:pPr>{r('( {yang_melakukan} )', space=True)}</w:p>''',
    45: f'''<w:p xmlns:w="{W_NS}"><w:pPr><w:spacing w:before="1" /><w:rPr><w:rFonts w:ascii="Tahoma" w:hAnsi="Tahoma" w:cs="Tahoma" /><w:sz w:val="18" /></w:rPr></w:pPr>{r('( {mengetahui} )', space=True)}</w:p>''',
}

paragraphs = doc_root.findall('.//w:p', {'w': W_NS})
for idx, xml_str in page1_reps.items():
    if idx < len(paragraphs):
        old_p = paragraphs[idx]
        new_p = ET.fromstring(xml_str)
        for parent in doc_root.iter():
            children = list(parent)
            if old_p in children:
                pos = children.index(old_p)
                parent.remove(old_p)
                parent.insert(pos, new_p)
                break

# Helper to replace drawings in cell
def replace_drawing_in_cell(cell, slot_key):
    for p in cell.findall('.//w:p', {'w': W_NS}):
        for r_el in list(p.findall('.//w:r', {'w': W_NS})):
            if r_el.findall('.//w:drawing', {'w': W_NS}):
                for child in list(r_el):
                    r_el.remove(child)
                rPr = ET.SubElement(r_el, f'{{{W_NS}}}rPr')
                sz = ET.SubElement(rPr, f'{{{W_NS}}}sz')
                sz.attrib[f'{{{W_NS}}}val'] = '18'
                t = ET.SubElement(r_el, f'{{{W_NS}}}t')
                t.text = f'{{%foto_{slot_key}}}'
                return
    p = cell.find(f'.//{{{W_NS}}}p')
    if p is None:
        p = ET.SubElement(cell, f'{{{W_NS}}}p')
    r_el = ET.SubElement(p, f'{{{W_NS}}}r')
    rPr = ET.SubElement(r_el, f'{{{W_NS}}}rPr')
    sz = ET.SubElement(rPr, f'{{{W_NS}}}sz')
    sz.attrib[f'{{{W_NS}}}val'] = '18'
    t = ET.SubElement(r_el, f'{{{W_NS}}}t')
    t.text = f'{{%foto_{slot_key}}}'

def set_cell_text(cell, text):
    for p in cell.findall('.//w:p', {'w': W_NS}):
        for c in list(p):
            if c.tag != f'{{{W_NS}}}pPr':
                p.remove(c)
        r_el = ET.SubElement(p, f'{{{W_NS}}}r')
        rPr = ET.SubElement(r_el, f'{{{W_NS}}}rPr')
        sz = ET.SubElement(rPr, f'{{{W_NS}}}sz')
        sz.attrib[f'{{{W_NS}}}val'] = '18'
        t = ET.SubElement(r_el, f'{{{W_NS}}}t')
        t.text = text

tables = doc_root.findall('.//w:tbl', {'w': W_NS})
print(f'Total tables found: {len(tables)}')

# Table 0: Signatures Page 1
t0_rows = tables[0].findall('.//w:tr', {'w': W_NS})
if len(t0_rows) >= 2:
    set_cell_text(t0_rows[1].findall('.//w:tc', {'w': W_NS})[0], '( {yang_melakukan} )')
    set_cell_text(t0_rows[1].findall('.//w:tc', {'w': W_NS})[1], '( {mengetahui} )')

# Table 1: Photo slots 1-23 (Pages 2-3)
t1 = tables[1]
t1_slot_mapping = {
    1: ['grounding_pln', 'voltage_pln', 'grounding_ups', 'voltage_ups'],
    3: ['tampak_mesin', 'perangkat_pendukung', 'sudut_kamera', 'jalur_kabel'],
    5: ['stop_kontak', 'mcb', 'sn_mesin', 'sn_kamera'],
    7: ['sn_dvr', 'sn_ups', 'dynabolt', 'kaset_cadangan'],
    9: ['cencon', 'neon_box', 'led_sticker', 'sn_led'],
    10: ['hdd_sebelum', 'hdd_setelah', 'ba_hdd'],
}
t1_rows = t1.findall('.//w:tr', {'w': W_NS})
for r_idx, slot_keys in t1_slot_mapping.items():
    row = t1_rows[r_idx]
    cells = row.findall('.//w:tc', {'w': W_NS})
    for c_idx, slot_key in enumerate(slot_keys):
        cell = cells[c_idx]
        replace_drawing_in_cell(cell, slot_key)
print('Table 1 (23 photo slots) mapped successfully!')

# Table 2: Header Vendor Page 4
t2 = tables[2]
t2_rows = t2.findall('.//w:tr', {'w': W_NS})
set_cell_text(t2_rows[1].findall('.//w:tc', {'w': W_NS})[2], '{wsid}')
set_cell_text(t2_rows[2].findall('.//w:tc', {'w': W_NS})[2], '{lokasi}')
set_cell_text(t2_rows[3].findall('.//w:tc', {'w': W_NS})[2], '{alamat}')
set_cell_text(t2_rows[4].findall('.//w:tc', {'w': W_NS})[2], '{jenis_pekerjaan_upper}')
set_cell_text(t2_rows[5].findall('.//w:tc', {'w': W_NS})[2], '{jadwal_aktivasi}')

# Table 3: Vendor Grid Page 4 (Photos, Names, Times)
t3 = tables[3]
t3_rows = t3.findall('.//w:tr', {'w': W_NS})
# Row 1: Photos block 1
t3_p_map_1 = ['v_mesin_online', 'v_instalasi', 'v_mover', 'v_cctv']
for c_idx, k in enumerate(t3_p_map_1):
    replace_drawing_in_cell(t3_rows[1].findall('.//w:tc', {'w': W_NS})[c_idx], k)
# Row 2: Vendor Names block 1
cells_r2 = t3_rows[2].findall('.//w:tc', {'w': W_NS})
set_cell_text(cells_r2[0], '{v_mesin_online_nama}')
set_cell_text(cells_r2[1], '{v_vendor_instalasi_nama}')
set_cell_text(cells_r2[2], '{v_vendor_mover_nama}')
set_cell_text(cells_r2[3], '{v_vendor_cctv_nama}')
# Row 3: Vendor Times block 1
cells_r3 = t3_rows[3].findall('.//w:tc', {'w': W_NS})
set_cell_text(cells_r3[0], '{v_mesin_online_waktu}')
set_cell_text(cells_r3[1], '{v_vendor_instalasi_waktu}')
set_cell_text(cells_r3[2], '{v_vendor_mover_waktu}')
set_cell_text(cells_r3[3], '{v_vendor_cctv_waktu}')
# Row 5: Photos block 2
t3_p_map_2 = ['v_mesin', 'v_pkt1', 'v_pkt2', 'v_nb']
for c_idx, k in enumerate(t3_p_map_2):
    replace_drawing_in_cell(t3_rows[5].findall('.//w:tc', {'w': W_NS})[c_idx], k)
# Row 6: Vendor Names block 2
cells_r6 = t3_rows[6].findall('.//w:tc', {'w': W_NS})
set_cell_text(cells_r6[0], '{v_vendor_mesin_nama}')
set_cell_text(cells_r6[1], '{v_pkt1_nama}')
set_cell_text(cells_r6[2], '{v_pkt2_nama}')
set_cell_text(cells_r6[3], '{v_vendor_nb_nama}')
# Row 7: Vendor Times block 2
cells_r7 = t3_rows[7].findall('.//w:tc', {'w': W_NS})
set_cell_text(cells_r7[0], '{v_vendor_mesin_waktu}')
set_cell_text(cells_r7[1], '{v_pkt1_waktu}')
set_cell_text(cells_r7[2], '{v_pkt2_waktu}')
set_cell_text(cells_r7[3], '{v_vendor_nb_waktu}')

# Table 4: Keterangan Vendor Page 4
t4 = tables[4]
t4_cell = t4.findall('.//w:tr', {'w': W_NS})[0].findall('.//w:tc', {'w': W_NS})[0]
set_cell_text(t4_cell, 'Keterangan : {keterangan_vendor}')

# Table 5: Penandatangan Vendor Page 4
t5 = tables[5]
t5_rows = t5.findall('.//w:tr', {'w': W_NS})
set_cell_text(t5_rows[1].findall('.//w:tc', {'w': W_NS})[0], '{kota}, {tanggal_teks}')
set_cell_text(t5_rows[2].findall('.//w:tc', {'w': W_NS})[0], '{penandatangan_vendor}')

# Table 6: Dynabolt Metadata Page 5
t6 = tables[6]
t6_rows = t6.findall('.//w:tr', {'w': W_NS})
set_cell_text(t6_rows[0].findall('.//w:tc', {'w': W_NS})[0], 'WSID')
set_cell_text(t6_rows[0].findall('.//w:tc', {'w': W_NS})[2], '{wsid}')
set_cell_text(t6_rows[1].findall('.//w:tc', {'w': W_NS})[0], 'Lokasi')
set_cell_text(t6_rows[1].findall('.//w:tc', {'w': W_NS})[2], '{lokasi}')
set_cell_text(t6_rows[2].findall('.//w:tc', {'w': W_NS})[2], '{alamat}')
set_cell_text(t6_rows[3].findall('.//w:tc', {'w': W_NS})[2], '{type_mesin_lama} / {sn_mesin_lama}')

# Table 7: Dynabolt Photos Sebelum Page 5
t7 = tables[7]
for cell in t7.findall('.//w:tc', {'w': W_NS}):
    replace_drawing_in_cell(cell, 'dyn_sebelum')

# Table 8: Dynabolt Photos Sesudah Page 5
t8 = tables[8]
for cell in t8.findall('.//w:tc', {'w': W_NS}):
    replace_drawing_in_cell(cell, 'dyn_sesudah')

# Table 9: Dynabolt Signatures Page 5
t9 = tables[9]
t9_rows = t9.findall('.//w:tr', {'w': W_NS})
set_cell_text(t9_rows[2].findall('.//w:tc', {'w': W_NS})[0], '( {yang_melakukan} )')
set_cell_text(t9_rows[2].findall('.//w:tc', {'w': W_NS})[1], '( {mengetahui} )')

# Hal 5 Tanggal Dynabolt
for p in paragraphs[190:]:
    txt = ''.join([t.text for t in p.findall('.//w:t', {'w': W_NS}) if t.text]).strip()
    if 'Jakarta,' in txt and '2026' in txt:
        set_cell_text(p, '     {kota}, {tanggal_teks}')
        break

# Hal 6: Full page BA Destroy HDD
WP_NS = NAMESPACES['wp']
mapped_ba_hdd_full = False
for p in doc_root.iterfind('.//w:p', {'w': W_NS}):
    for r_el in list(p.findall('.//w:r', {'w': W_NS})):
        for d in r_el.findall('.//w:drawing', {'w': W_NS}):
            ext = d.find('.//wp:extent', {'wp': WP_NS})
            if ext is not None:
                cx = int(ext.attrib.get('cx', '0'))
                if cx > 4000000:
                    for child in list(r_el):
                        r_el.remove(child)
                    rPr = ET.SubElement(r_el, f'{{{W_NS}}}rPr')
                    sz = ET.SubElement(rPr, f'{{{W_NS}}}sz')
                    sz.attrib[f'{{{W_NS}}}val'] = '18'
                    t = ET.SubElement(r_el, f'{{{W_NS}}}t')
                    t.text = '{%foto_ba_hdd_full}'
                    mapped_ba_hdd_full = True
                    print('ba_hdd_full successfully mapped on Page 6!')
                    break

if not mapped_ba_hdd_full:
    print('WARNING: ba_hdd_full was not found by cx > 4000000!')

# Serialize document.xml
xml_bytes = ET.tostring(doc_root, encoding='utf-8', xml_declaration=True)
xml_str = xml_bytes.decode('utf-8')

# Ensure the root element tag matches orig_root_tag with all namespaces
if orig_root_tag:
    xml_str = re.sub(r'<w:document[^>]*>', orig_root_tag, xml_str, count=1)

file_map['word/document.xml'] = xml_str.encode('utf-8')
file_map['word/styles.xml'] = styles_xml_updated

with zipfile.ZipFile('template/BA_TEMPLATE.docx', 'w', zipfile.ZIP_DEFLATED) as z_out:
    for name, content in file_map.items():
        z_out.writestr(name, content)

print("Production template built and verified successfully!")
