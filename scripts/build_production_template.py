import zipfile
import re
import copy
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

# Ensure xmlns:a, xmlns:pic, xmlns:wp, xmlns:r are present in root tag
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

def make_tiny_p(sectPr=None):
    p = ET.Element(f'{{{W_NS}}}p')
    pPr = ET.SubElement(p, f'{{{W_NS}}}pPr')
    ET.SubElement(pPr, f'{{{W_NS}}}pStyle').attrib[f'{{{W_NS}}}val'] = 'BodyText'
    sp = ET.SubElement(pPr, f'{{{W_NS}}}spacing')
    sp.attrib[f'{{{W_NS}}}before'] = '0'
    sp.attrib[f'{{{W_NS}}}after'] = '0'
    sp.attrib[f'{{{W_NS}}}line'] = '20'
    sp.attrib[f'{{{W_NS}}}lineRule'] = 'exact'
    rPr = ET.SubElement(pPr, f'{{{W_NS}}}rPr')
    ET.SubElement(rPr, f'{{{W_NS}}}sz').attrib[f'{{{W_NS}}}val'] = '2'
    ET.SubElement(rPr, f'{{{W_NS}}}szCs').attrib[f'{{{W_NS}}}val'] = '2'
    if sectPr is not None:
        pPr.append(sectPr)
    return p

# Helper functions for paragraph generation
def make_p_xml(p_runs_xml, tab1=3100, tab2=None, tab3=None, spacing_before=1):
    tabs_xml = f'<w:tab w:val="left" w:pos="{tab1}" />'
    if tab2:
        tabs_xml += f'<w:tab w:val="left" w:pos="{tab2}" />'
    if tab3:
        tabs_xml += f'<w:tab w:val="left" w:pos="{tab3}" />'
    return f'''<w:p xmlns:w="{W_NS}">
  <w:pPr>
    <w:pStyle w:val="BodyText" />
    <w:tabs>{tabs_xml}</w:tabs>
    <w:spacing w:before="{spacing_before}" />
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
    return f'<w:r><w:rPr><w:rFonts w:ascii="Tahoma" w:hAnsi="Tahoma" w:cs="Tahoma" /><w:sz w:val="18" /><w:szCs w:val="18" /></w:rPr><w:tab /><w:t xml:space="preserve">: </w:t></w:r>'

def tab():
    return f'<w:r><w:rPr><w:rFonts w:ascii="Tahoma" w:hAnsi="Tahoma" w:cs="Tahoma" /><w:sz w:val="18" /><w:szCs w:val="18" /></w:rPr><w:tab /></w:r>'

def br():
    return '<w:r><w:br /></w:r>'

# Title on Page 1: "Berita Acara Instalasi ATM" font 12pt (sz: 24), centered
p0_xml = f'''<w:p xmlns:w="{W_NS}">
  <w:pPr>
    <w:pStyle w:val="Heading1" />
    <w:jc w:val="center" />
    <w:spacing w:before="60" w:after="60" />
    <w:rPr>
      <w:rFonts w:ascii="Tahoma" w:hAnsi="Tahoma" w:cs="Tahoma" />
      <w:b />
      <w:sz w:val="24" />
      <w:szCs w:val="24" />
      <w:lang w:val="id-ID" />
    </w:rPr>
  </w:pPr>
  <w:r>
    <w:rPr>
      <w:rFonts w:ascii="Tahoma" w:hAnsi="Tahoma" w:cs="Tahoma" />
      <w:b />
      <w:sz w:val="24" />
      <w:szCs w:val="24" />
    </w:rPr>
    <w:t>Berita Acara Instalasi ATM</w:t>
  </w:r>
</w:p>'''

# Paragraph replacements on Page 1
page1_reps = {
    0: p0_xml,
    2: f'''<w:p xmlns:w="{W_NS}"><w:pPr><w:pStyle w:val="BodyText" /><w:spacing w:before="40" w:after="40" /><w:rPr><w:rFonts w:ascii="Tahoma" w:hAnsi="Tahoma" w:cs="Tahoma" /><w:sz w:val="18" /><w:szCs w:val="18" /></w:rPr></w:pPr>{r('Pada hari {hari} ,{tanggal_teks} telah dilakukan Instalasi mesin ATM BCA dengan data sebagai berikut:', space=True)}</w:p>''',
    4: make_p_xml(r('Lokasi') + tab_colon() + r('{lokasi}') + br() + r('WSID') + tab_colon() + r('{wsid}')),
    5: make_p_xml(r('Alamat') + tab_colon() + r('{alamat}')),
    6: make_p_xml(r('Lokasi Lama') + tab_colon() + r('{lokasi_lama}')),
    7: make_p_xml(r('WSID Lama') + tab_colon() + r('{wsid_lama}')),
    8: make_p_xml(r('Type Mesin') + tab_colon() + r('{type_mesin_baru}')),
    9: make_p_xml(r('Serial Nomor') + tab_colon() + r('{serial_nomor}')),
    10: make_p_xml(
        r('Baru/Relokasi') + tab_colon() + r('{jenis_pekerjaan}') + br() +
        r('Tegangan Listrik (UPS-IT)') + tab_colon() + r('{tegangan_ups_it} Volt', space=True) + br() +
        r('Grounding (UPS-IT)') + tab_colon() + r('{grounding_ups_it} Volt', space=True),
        tab1=3100
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
        tab1=3100, tab2=4889
    ),
    23: make_p_xml(
        tab() + r(': - Stiker Mesin', space=True) + tab() + r(': {stiker_mesin}', space=True),
        tab1=3100, tab2=4889
    ),
    24: make_p_xml(
        r('Indoor') + tab_colon() + r('- Kabel Jalur') + tab() + r(': {kabel_jalur}', space=True),
        tab1=3100, tab2=4889
    ),
    25: make_p_xml(
        tab() + r(': Colokan Listrik', space=True) + tab() + r(': {colokan_listrik}', space=True),
        tab1=3100, tab2=4889
    ),
    26: make_p_xml(
        tab() + r(': Perekam Eksternal', space=True) + tab() + r(': {perekam_eksternal_status} - Merk: {perekam_eksternal_merk}', space=True) +
        tab() + r('SN: {perekam_eksternal_sn}', space=True),
        tab1=3100, tab2=4889, tab3=7800
    ),
    27: make_p_xml(
        tab() + r(': Kamera Eksternal', space=True) + tab() + r(': {kamera_eksternal_status} - Merk: {kamera_eksternal_merk}', space=True) +
        tab() + r('SN: {kamera_eksternal_sn}', space=True),
        tab1=3100, tab2=4889, tab3=7800
    ),
    28: make_p_xml(
        tab() + r(': UPS', space=True) + tab() + r(': {ups_status} - Merk: {ups_merk}', space=True) +
        tab() + r('SN: {ups_sn}', space=True),
        tab1=3100, tab2=4889, tab3=7800
    ),
    29: make_p_xml(
        tab() + r(': LED', space=True) + tab() + r(': {led_status} - Merk: {led_merk}', space=True) +
        tab() + r('SN: {led_sn}', space=True),
        tab1=3100, tab2=4889, tab3=7800
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
        r('Jika “Tidak” harap info type pengaman pengganti :  {pengaman_dynabolt_box} Dynabold   {pengaman_alarm_box} Alarm', space=True) + br() +
        r('Harap info alasan menggunakan Dynabold/Alarm : ', space=True) + r('{angkur_alasan}')
    ),
    34: f'''<w:p xmlns:w="{W_NS}"><w:pPr><w:spacing w:before="0" w:after="0" /><w:rPr><w:sz w:val="2"/><w:szCs w:val="2"/></w:rPr></w:pPr></w:p>''',
    35: f'''<w:p xmlns:w="{W_NS}"><w:pPr><w:spacing w:before="0" w:after="0" /><w:rPr><w:sz w:val="2"/><w:szCs w:val="2"/></w:rPr></w:pPr></w:p>''',
    36: make_p_xml(
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
        r(' (Khusus Jabodetabek, jika “Ya” harap tuliskan nama vendor: ', space=True) + r('{supersite_vendor})', space=True)
    ),
    37: f'''<w:p xmlns:w="{W_NS}"><w:pPr><w:spacing w:before="0" w:after="0" /><w:rPr><w:sz w:val="2"/><w:szCs w:val="2"/></w:rPr></w:pPr></w:p>''',
    38: make_p_xml(
        tab() + r(': Exhaust Fan', space=True) + tab() + r(': {exhaust_fan_text}', space=True) +
        r('   [  ]    [  ] Mati', space=True) + br() +
        r('Jika Tidak pasang supersite mohon alasannya : ', space=True) + r('{supersite_alasan}'),
        tab1=3100, tab2=4889
    ),
    39: f'''<w:p xmlns:w="{W_NS}"><w:pPr><w:spacing w:before="0" w:after="0" /><w:rPr><w:sz w:val="2"/><w:szCs w:val="2"/></w:rPr></w:pPr></w:p>''',
    40: f'''<w:p xmlns:w="{W_NS}"><w:pPr><w:spacing w:before="0" w:after="0" /><w:rPr><w:sz w:val="2"/><w:szCs w:val="2"/></w:rPr></w:pPr></w:p>''',
    41: make_p_xml(r('Tanggal Email Permintaan Mesin') + tab_colon() + r('{tanggal_email_permintaan}')),
    42: f'''<w:p xmlns:w="{W_NS}"><w:pPr><w:spacing w:before="0" w:after="0" /><w:rPr><w:sz w:val="2"/><w:szCs w:val="2"/></w:rPr></w:pPr></w:p>''',
    43: f'''<w:p xmlns:w="{W_NS}"><w:pPr><w:spacing w:before="0" w:after="0" /><w:rPr><w:sz w:val="2"/><w:szCs w:val="2"/></w:rPr></w:pPr></w:p>''',
    44: make_p_xml(r('Koordinat') + tab_colon() + r('{koordinat_text}')),
    45: f'''<w:p xmlns:w="{W_NS}">
  <w:pPr>
    <w:pStyle w:val="BodyText" />
    <w:ind w:left="684" />
    <w:spacing w:before="80" w:after="40" />
    <w:rPr>
      <w:rFonts w:ascii="Tahoma" w:hAnsi="Tahoma" w:cs="Tahoma" />
      <w:sz w:val="18" />
      <w:szCs w:val="18" />
    </w:rPr>
  </w:pPr>
  {r('{kota}, {tanggal_teks}')}
</w:p>''',
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
                if idx == 45:
                    # Enter 2x after Koordinat before {kota}, {tanggal_teks}
                    p_empty1 = ET.fromstring(f'''<w:p xmlns:w="{W_NS}"><w:pPr><w:pStyle w:val="BodyText" /><w:spacing w:before="0" w:after="0" /><w:rPr><w:rFonts w:ascii="Tahoma" w:hAnsi="Tahoma" w:cs="Tahoma" /><w:sz w:val="18" /><w:szCs w:val="18" /></w:rPr></w:pPr></w:p>''')
                    p_empty2 = ET.fromstring(f'''<w:p xmlns:w="{W_NS}"><w:pPr><w:pStyle w:val="BodyText" /><w:spacing w:before="0" w:after="0" /><w:rPr><w:rFonts w:ascii="Tahoma" w:hAnsi="Tahoma" w:cs="Tahoma" /><w:sz w:val="18" /><w:szCs w:val="18" /></w:rPr></w:pPr></w:p>''')
                    parent.insert(pos, p_empty1)
                    parent.insert(pos + 1, p_empty2)
                    pos += 2
                parent.remove(old_p)
                parent.insert(pos, new_p)
                break

# Neutralize any multi-column or section breaks inside Page 1 (before Table 0)
body = doc_root.find('.//w:body', {'w': W_NS})
tables = doc_root.findall('.//w:tbl', {'w': W_NS})
t0 = tables[0]
t0_body_pos = list(body).index(t0)
for p in list(body)[:t0_body_pos]:
    if p.tag.endswith('p'):
        pPr = p.find(f'{{{W_NS}}}pPr')
        if pPr is not None:
            sectPr = pPr.find(f'{{{W_NS}}}sectPr')
            if sectPr is not None:
                pPr.remove(sectPr)

# Fix any remaining 2-column sections in body
for sectPr in body.findall('.//w:sectPr', {'w': W_NS}):
    cols = sectPr.find(f'{{{W_NS}}}cols')
    if cols is not None and cols.attrib.get(f'{{{W_NS}}}num') == '2':
        cols.clear()
        cols.attrib[f'{{{W_NS}}}space'] = '720'

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
    for c in list(p):
        if c.tag != f'{{{W_NS}}}pPr':
            p.remove(c)
    r_el = ET.SubElement(p, f'{{{W_NS}}}r')
    rPr = ET.SubElement(r_el, f'{{{W_NS}}}rPr')
    sz = ET.SubElement(rPr, f'{{{W_NS}}}sz')
    sz.attrib[f'{{{W_NS}}}val'] = '18'
    t = ET.SubElement(r_el, f'{{{W_NS}}}t')
    t.text = f'{{%foto_{slot_key}}}'

def set_p_text(p, text):
    for c in list(p):
        if c.tag != f'{{{W_NS}}}pPr':
            p.remove(c)
    r_el = ET.SubElement(p, f'{{{W_NS}}}r')
    rPr = ET.SubElement(r_el, f'{{{W_NS}}}rPr')
    sz = ET.SubElement(rPr, f'{{{W_NS}}}sz')
    sz.attrib[f'{{{W_NS}}}val'] = '18'
    t = ET.SubElement(r_el, f'{{{W_NS}}}t')
    t.text = text

def set_cell_text(cell, text):
    p = cell.find(f'.//{{{W_NS}}}p')
    if p is None:
        p = ET.SubElement(cell, f'{{{W_NS}}}p')
    for extra_p in list(cell.findall(f'.//{{{W_NS}}}p'))[1:]:
        cell.remove(extra_p)
    set_p_text(p, text)

tables = doc_root.findall('.//w:tbl', {'w': W_NS})
print(f'Total tables found: {len(tables)}')

def setup_sig_header(cell, text, ind_left="50", jc_val=None):
    for c in list(cell):
        if c.tag != f'{{{W_NS}}}tcPr':
            cell.remove(c)
    p = ET.SubElement(cell, f'{{{W_NS}}}p')
    pPr = ET.SubElement(p, f'{{{W_NS}}}pPr')
    ET.SubElement(pPr, f'{{{W_NS}}}pStyle').attrib[f'{{{W_NS}}}val'] = 'TableParagraph'
    sp = ET.SubElement(pPr, f'{{{W_NS}}}spacing')
    sp.attrib[f'{{{W_NS}}}line'] = '198'
    sp.attrib[f'{{{W_NS}}}lineRule'] = 'exact'
    if ind_left:
        ET.SubElement(pPr, f'{{{W_NS}}}ind').attrib[f'{{{W_NS}}}left'] = ind_left
    if jc_val:
        ET.SubElement(pPr, f'{{{W_NS}}}jc').attrib[f'{{{W_NS}}}val'] = jc_val
    rPr_p = ET.SubElement(pPr, f'{{{W_NS}}}rPr')
    ET.SubElement(rPr_p, f'{{{W_NS}}}rFonts').attrib[f'{{{W_NS}}}ascii'] = 'Tahoma'
    ET.SubElement(rPr_p, f'{{{W_NS}}}rFonts').attrib[f'{{{W_NS}}}hAnsi'] = 'Tahoma'
    ET.SubElement(rPr_p, f'{{{W_NS}}}rFonts').attrib[f'{{{W_NS}}}cs'] = 'Tahoma'
    ET.SubElement(rPr_p, f'{{{W_NS}}}sz').attrib[f'{{{W_NS}}}val'] = '18'
    ET.SubElement(rPr_p, f'{{{W_NS}}}szCs').attrib[f'{{{W_NS}}}val'] = '18'
    r_el = ET.SubElement(p, f'{{{W_NS}}}r')
    rPr = ET.SubElement(r_el, f'{{{W_NS}}}rPr')
    ET.SubElement(rPr, f'{{{W_NS}}}rFonts').attrib[f'{{{W_NS}}}ascii'] = 'Tahoma'
    ET.SubElement(rPr, f'{{{W_NS}}}rFonts').attrib[f'{{{W_NS}}}hAnsi'] = 'Tahoma'
    ET.SubElement(rPr, f'{{{W_NS}}}rFonts').attrib[f'{{{W_NS}}}cs'] = 'Tahoma'
    ET.SubElement(rPr, f'{{{W_NS}}}sz').attrib[f'{{{W_NS}}}val'] = '18'
    ET.SubElement(rPr, f'{{{W_NS}}}szCs').attrib[f'{{{W_NS}}}val'] = '18'
    ET.SubElement(r_el, f'{{{W_NS}}}t').text = text

def setup_sig_name(cell, name_placeholder, ind_left="50", jc_val=None):
    for c in list(cell):
        if c.tag != f'{{{W_NS}}}tcPr':
            cell.remove(c)
    for _ in range(2):
        p_sp = ET.SubElement(cell, f'{{{W_NS}}}p')
        pPr_sp = ET.SubElement(p_sp, f'{{{W_NS}}}pPr')
        ET.SubElement(pPr_sp, f'{{{W_NS}}}pStyle').attrib[f'{{{W_NS}}}val'] = 'TableParagraph'
        sp = ET.SubElement(pPr_sp, f'{{{W_NS}}}spacing')
        sp.attrib[f'{{{W_NS}}}line'] = '198'
        sp.attrib[f'{{{W_NS}}}lineRule'] = 'exact'
        if ind_left:
            ET.SubElement(pPr_sp, f'{{{W_NS}}}ind').attrib[f'{{{W_NS}}}left'] = ind_left
        if jc_val:
            ET.SubElement(pPr_sp, f'{{{W_NS}}}jc').attrib[f'{{{W_NS}}}val'] = jc_val
        rPr_sp = ET.SubElement(pPr_sp, f'{{{W_NS}}}rPr')
        ET.SubElement(rPr_sp, f'{{{W_NS}}}sz').attrib[f'{{{W_NS}}}val'] = '18'
        ET.SubElement(rPr_sp, f'{{{W_NS}}}szCs').attrib[f'{{{W_NS}}}val'] = '18'
    p = ET.SubElement(cell, f'{{{W_NS}}}p')
    pPr = ET.SubElement(p, f'{{{W_NS}}}pPr')
    ET.SubElement(pPr, f'{{{W_NS}}}pStyle').attrib[f'{{{W_NS}}}val'] = 'TableParagraph'
    sp = ET.SubElement(pPr, f'{{{W_NS}}}spacing')
    sp.attrib[f'{{{W_NS}}}line'] = '198'
    sp.attrib[f'{{{W_NS}}}lineRule'] = 'exact'
    if ind_left:
        ET.SubElement(pPr, f'{{{W_NS}}}ind').attrib[f'{{{W_NS}}}left'] = ind_left
    if jc_val:
        ET.SubElement(pPr, f'{{{W_NS}}}jc').attrib[f'{{{W_NS}}}val'] = jc_val
    rPr_p = ET.SubElement(pPr, f'{{{W_NS}}}rPr')
    ET.SubElement(rPr_p, f'{{{W_NS}}}rFonts').attrib[f'{{{W_NS}}}ascii'] = 'Tahoma'
    ET.SubElement(rPr_p, f'{{{W_NS}}}rFonts').attrib[f'{{{W_NS}}}hAnsi'] = 'Tahoma'
    ET.SubElement(rPr_p, f'{{{W_NS}}}rFonts').attrib[f'{{{W_NS}}}cs'] = 'Tahoma'
    ET.SubElement(rPr_p, f'{{{W_NS}}}sz').attrib[f'{{{W_NS}}}val'] = '18'
    ET.SubElement(rPr_p, f'{{{W_NS}}}szCs').attrib[f'{{{W_NS}}}val'] = '18'
    r_el = ET.SubElement(p, f'{{{W_NS}}}r')
    rPr = ET.SubElement(r_el, f'{{{W_NS}}}rPr')
    ET.SubElement(rPr, f'{{{W_NS}}}rFonts').attrib[f'{{{W_NS}}}ascii'] = 'Tahoma'
    ET.SubElement(rPr, f'{{{W_NS}}}rFonts').attrib[f'{{{W_NS}}}hAnsi'] = 'Tahoma'
    ET.SubElement(rPr, f'{{{W_NS}}}rFonts').attrib[f'{{{W_NS}}}cs'] = 'Tahoma'
    ET.SubElement(rPr, f'{{{W_NS}}}sz').attrib[f'{{{W_NS}}}val'] = '18'
    ET.SubElement(rPr, f'{{{W_NS}}}szCs').attrib[f'{{{W_NS}}}val'] = '18'
    ET.SubElement(r_el, f'{{{W_NS}}}t').text = f'( {name_placeholder} )'

# Table 0: Signatures Page 1 (Yang melakukan / Mengetahui) - NO TRIPLE DATA & PERFECT VERTICAL ALIGNMENT
t0_rows = tables[0].findall('.//w:tr', {'w': W_NS})
if len(t0_rows) >= 2:
    setup_sig_header(t0_rows[0].findall('.//w:tc', {'w': W_NS})[0], 'Yang melakukan,', ind_left="50", jc_val=None)
    setup_sig_header(t0_rows[0].findall('.//w:tc', {'w': W_NS})[1], 'Mengetahui,', ind_left="2085", jc_val="center")
    setup_sig_name(t0_rows[1].findall('.//w:tc', {'w': W_NS})[0], '{yang_melakukan}', ind_left="50", jc_val=None)
    setup_sig_name(t0_rows[1].findall('.//w:tc', {'w': W_NS})[1], '{mengetahui}', ind_left="2085", jc_val="center")

# Table 1: Photo slots (Lembar 2) - EXACTLY 12 ROWS, FITS IN 1 SHEET
t1 = tables[1]
t1_rows = t1.findall('.//w:tr', {'w': W_NS})

# Replace existing rows 0 to 9 with proper slots
t1_slot_mapping = {
    1: ['grounding_pln', 'voltage_pln', 'grounding_ups', 'voltage_ups'],
    3: ['tampak_mesin', 'perangkat_pendukung', 'sudut_kamera', 'jalur_kabel'],
    5: ['stop_kontak', 'mcb', 'sn_mesin', 'sn_kamera'],
    7: ['sn_dvr', 'sn_ups', 'dynabolt', 'kaset_cadangan'],
    9: ['cencon', 'neon_box', 'led_sticker', 'sn_led'],
}

for r_idx, slot_keys in t1_slot_mapping.items():
    row = t1_rows[r_idx]
    cells = row.findall('.//w:tc', {'w': W_NS})
    for c_idx, slot_key in enumerate(slot_keys):
        replace_drawing_in_cell(cells[c_idx], slot_key)

# Build Row 10 (Header) and Row 11 (Photos) for Destroy HDD, replacing Row 10
orig_r10 = t1_rows[10]

# Row 10 Header
r10_header = copy.deepcopy(t1_rows[8]) # Copy header row style
r10_cells = r10_header.findall('.//w:tc', {'w': W_NS})
set_cell_text(r10_cells[0], 'Sebelum Destroy HDD')
set_cell_text(r10_cells[1], 'Setelah Destroy HDD')
set_cell_text(r10_cells[2], 'BA Destroy HDD')
set_cell_text(r10_cells[3], '')

# Row 11 Photos
r11_photo = copy.deepcopy(t1_rows[9]) # Copy photo row style
r11_cells = r11_photo.findall('.//w:tc', {'w': W_NS})
set_cell_text(r11_cells[0], '{%foto_hdd_sebelum}')
set_cell_text(r11_cells[1], '{%foto_hdd_setelah}')
set_cell_text(r11_cells[2], '{%foto_ba_hdd}')
set_cell_text(r11_cells[3], '')

# Replace orig_r10 in t1
pos10 = list(t1).index(orig_r10)
t1.remove(orig_r10)
t1.insert(pos10, r10_header)
t1.insert(pos10 + 1, r11_photo)

# Adjust row heights of Table 1 so all 12 rows fit cleanly on 1 single page
all_t1_rows = t1.findall('.//w:tr', {'w': W_NS})
print(f'Table 1 total rows now: {len(all_t1_rows)}')
for idx, r_elem in enumerate(all_t1_rows):
    trPr = r_elem.find(f'{{{W_NS}}}trPr')
    if trPr is None:
        trPr = ET.SubElement(r_elem, f'{{{W_NS}}}trPr')
    # cantSplit
    if trPr.find(f'{{{W_NS}}}cantSplit') is None:
        ET.SubElement(trPr, f'{{{W_NS}}}cantSplit')
    # Adjust heights
    trHeight = trPr.find(f'{{{W_NS}}}trHeight')
    if trHeight is None:
        trHeight = ET.SubElement(trPr, f'{{{W_NS}}}trHeight')
    if idx % 2 == 0:
        # Header row: 280 dxa (~0.49 cm)
        trHeight.attrib[f'{{{W_NS}}}val'] = '280'
    else:
        # Photo row: 1800 dxa (~3.17 cm)
        trHeight.attrib[f'{{{W_NS}}}val'] = '1800'
    trHeight.attrib[f'{{{W_NS}}}hRule'] = 'atLeast'

# Sambungan Lembar 1 -> 2:
# Sisakan SATU paragraf tiny setelah Table 0 sebagai pembawa sectPr (default nextPage).
# Hapus paragraf kosong lain dan pastikan TANPA pageBreakBefore.
t0_pos = list(body).index(tables[0])
t1_pos = list(body).index(t1)
between_0_1 = [p for p in list(body)[t0_pos + 1 : t1_pos] if p.tag.endswith('p')]

sectPr_1 = None
for p in between_0_1:
    s = p.find(f'.//{{{W_NS}}}sectPr')
    if s is not None:
        sectPr_1 = copy.deepcopy(s)
        break

if sectPr_1 is not None:
    type_elem = sectPr_1.find(f'{{{W_NS}}}type')
    if type_elem is not None:
        sectPr_1.remove(type_elem)

for p in between_0_1:
    body.remove(p)

tiny_p_1 = make_tiny_p(sectPr=sectPr_1)
t0_new_pos = list(body).index(tables[0])
body.insert(t0_new_pos + 1, tiny_p_1)

# Sambungan Lembar 2 -> 3:
# Sisakan SATU paragraf tiny pembawa sectPr setelah Table 1, TANPA pageBreakBefore.
# Section berikutnya dibuat nextPage (hapus w:type continuous dari sectPr final body).
t1_pos = list(body).index(t1)
t2_pos = list(body).index(tables[2])
between_1_2 = [p for p in list(body)[t1_pos + 1 : t2_pos] if p.tag.endswith('p')]

sectPr_2 = None
for p in between_1_2:
    s = p.find(f'.//{{{W_NS}}}sectPr')
    if s is not None:
        pgMar = s.find(f'{{{W_NS}}}pgMar')
        if pgMar is not None and pgMar.attrib.get(f'{{{W_NS}}}top') == '480':
            sectPr_2 = copy.deepcopy(s)
            break
        elif sectPr_2 is None:
            sectPr_2 = copy.deepcopy(s)

if sectPr_2 is not None:
    type_elem = sectPr_2.find(f'{{{W_NS}}}type')
    if type_elem is not None:
        sectPr_2.remove(type_elem)

for p in between_1_2:
    body.remove(p)

tiny_p_2 = make_tiny_p(sectPr=sectPr_2)
t1_new_pos = list(body).index(t1)
body.insert(t1_new_pos + 1, tiny_p_2)

# Hapus w:type continuous dari sectPr final body agar Section Lembar 3 s/d akhir bertipe nextPage
final_sectPr = body.find(f'{{{W_NS}}}sectPr')
if final_sectPr is not None:
    final_type = final_sectPr.find(f'{{{W_NS}}}type')
    if final_type is not None:
        final_sectPr.remove(final_type)

# Table 2: Header Vendor Page 4
t2 = tables[2]
t2_rows = t2.findall('.//w:tr', {'w': W_NS})
set_cell_text(t2_rows[1].findall('.//w:tc', {'w': W_NS})[2], '{wsid}')
set_cell_text(t2_rows[2].findall('.//w:tc', {'w': W_NS})[2], '{lokasi}')
set_cell_text(t2_rows[3].findall('.//w:tc', {'w': W_NS})[2], '{alamat}')
set_cell_text(t2_rows[4].findall('.//w:tc', {'w': W_NS})[2], '{jenis_pekerjaan_upper}')
set_cell_text(t2_rows[5].findall('.//w:tc', {'w': W_NS})[2], '{jadwal_aktivasi}')

# Table 3: Vendor Grid Page 4 (Photos and Dates only - extra row with '-' removed)
t3 = tables[3]
t3_rows = t3.findall('.//w:tr', {'w': W_NS})
# Row 1: Photos block 1
t3_p_map_1 = ['v_mesin_online', 'v_instalasi', 'v_mover', 'v_cctv']
for c_idx, k in enumerate(t3_p_map_1):
    replace_drawing_in_cell(t3_rows[1].findall('.//w:tc', {'w': W_NS})[c_idx], k)

# Row 3: Vendor Times block 1 (auto fills with tanggal pengerjaan via data-builder)
cells_r3 = t3_rows[3].findall('.//w:tc', {'w': W_NS})
set_cell_text(cells_r3[0], '{v_mesin_online_waktu}')
set_cell_text(cells_r3[1], '{v_vendor_instalasi_waktu}')
set_cell_text(cells_r3[2], '{v_vendor_mover_waktu}')
set_cell_text(cells_r3[3], '{v_vendor_cctv_waktu}')

# Row 5: Photos block 2
t3_p_map_2 = ['v_mesin', 'v_pkt1', 'v_pkt2', 'v_nb']
for c_idx, k in enumerate(t3_p_map_2):
    replace_drawing_in_cell(t3_rows[5].findall('.//w:tc', {'w': W_NS})[c_idx], k)

# Row 7: Vendor Times block 2
cells_r7 = t3_rows[7].findall('.//w:tc', {'w': W_NS})
set_cell_text(cells_r7[0], '{v_vendor_mesin_waktu}')
set_cell_text(cells_r7[1], '{v_pkt1_waktu}')
set_cell_text(cells_r7[2], '{v_pkt2_waktu}')
set_cell_text(cells_r7[3], '{v_vendor_nb_waktu}')

# Remove extra rows: Row 6 first, then Row 2
t3.remove(t3_rows[6])
t3.remove(t3_rows[2])

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

# Dynabolt Page: Preserving "Sebelum pemasangan dynabolt" and "Sesudah pemasangan dynabolt" textboxes/drawings
# 1. Update intro paragraph for Dynabolt
for p in body.findall('.//w:p', {'w': W_NS}):
    txt = ''.join([t.text for t in p.findall('.//w:t', {'w': W_NS}) if t.text]).strip()
    if 'sebelum pemasangan dynabolt' in txt.lower() and 'telah dilakukan' in txt.lower():
        # Keep children 0 and 1 (pPr and drawing with "Sebelum pemasangan dynabolt")
        for child in list(p)[2:]:
            p.remove(child)
        r_dyn_intro = ET.SubElement(p, f'{{{W_NS}}}r')
        rPr_intro = ET.SubElement(r_dyn_intro, f'{{{W_NS}}}rPr')
        ET.SubElement(rPr_intro, f'{{{W_NS}}}sz').attrib[f'{{{W_NS}}}val'] = '18'
        ET.SubElement(rPr_intro, f'{{{W_NS}}}szCs').attrib[f'{{{W_NS}}}val'] = '18'
        t_intro = ET.SubElement(r_dyn_intro, f'{{{W_NS}}}t')
        t_intro.attrib['xml:space'] = 'preserve'
        t_intro.text = 'Pada hari {hari}, {tanggal_teks} telah dilakukan pemasangan pengamanan mesin yaitu dynabolt dengan data sbb :'
        break

# 2. Update date paragraph for Dynabolt (DO NOT wipe out child 1: bracket and child 2: "Sesudah pemasangan dynabolt")
for p in body.findall('.//w:p', {'w': W_NS}):
    txt = ''.join([t.text for t in p.findall('.//w:t', {'w': W_NS}) if t.text]).strip()
    if 'sesudah pemasangan dynabolt' in txt.lower():
        print('Found Sesudah pemasangan dynabolt paragraph, updating date while preserving drawing...')
        # Remove only text runs after child 2
        for child in list(p)[3:]:
            p.remove(child)
        r_dyn_date = ET.SubElement(p, f'{{{W_NS}}}r')
        rPr_date = ET.SubElement(r_dyn_date, f'{{{W_NS}}}rPr')
        ET.SubElement(rPr_date, f'{{{W_NS}}}sz').attrib[f'{{{W_NS}}}val'] = '18'
        ET.SubElement(rPr_date, f'{{{W_NS}}}szCs').attrib[f'{{{W_NS}}}val'] = '18'
        t_date = ET.SubElement(r_dyn_date, f'{{{W_NS}}}t')
        t_date.attrib['xml:space'] = 'preserve'
        t_date.text = '     {kota}, {tanggal_teks}'
        break

# Sambungan Lembar 3 -> 4:
# Hapus paragraf-paragraf kosong di antara tabel tanda tangan vendor (t5) dan judul Dynabolt,
# sisakan SATU paragraf tiny. Biarkan pageBreakBefore HANYA di judul Dynabolt.
t5_pos = list(body).index(t5)
dyn_header_p = None
for p in body.findall('.//w:p', {'w': W_NS}):
    txt = ''.join([t.text for t in p.findall('.//w:t', {'w': W_NS}) if t.text]).strip()
    if 'Pemasangan Dynabolt' in txt:
        dyn_header_p = p
        break

if dyn_header_p is not None:
    dyn_pos = list(body).index(dyn_header_p)
    between_5_dyn = [p for p in list(body)[t5_pos + 1 : dyn_pos] if p.tag.endswith('p')]
    print(f'Paragraphs between Table 5 and Dynabolt header: {len(between_5_dyn)}')
    for p in between_5_dyn:
        body.remove(p)
    tiny_p_3 = make_tiny_p()
    t5_new_pos = list(body).index(t5)
    body.insert(t5_new_pos + 1, tiny_p_3)
    pPr = dyn_header_p.find(f'{{{W_NS}}}pPr')
    if pPr is None:
        pPr = ET.Element(f'{{{W_NS}}}pPr')
        dyn_header_p.insert(0, pPr)
    if pPr.find(f'{{{W_NS}}}pageBreakBefore') is None:
        pPr.append(ET.Element(f'{{{W_NS}}}pageBreakBefore'))

# Sambungan Lembar 4 -> 5:
# Hapus paragraf-paragraf kosong di antara tabel tanda tangan dynabolt (t9) dan judul HDD,
# sisakan SATU paragraf tiny. Biarkan pageBreakBefore HANYA di judul HDD.
t9_pos = list(body).index(t9)
hdd_header_p = None
for p in body.findall('.//w:p', {'w': W_NS}):
    txt = ''.join([t.text for t in p.findall('.//w:t', {'w': W_NS}) if t.text]).strip()
    if 'Penghancuran Hard Disk' in txt:
        hdd_header_p = p
        break

if hdd_header_p is not None:
    hdd_pos = list(body).index(hdd_header_p)
    between_9_hdd = [p for p in list(body)[t9_pos + 1 : hdd_pos] if p.tag.endswith('p')]
    print(f'Paragraphs between Table 9 and HDD header: {len(between_9_hdd)}')
    for p in between_9_hdd:
        body.remove(p)
    tiny_p_4 = make_tiny_p()
    t9_new_pos = list(body).index(t9)
    body.insert(t9_new_pos + 1, tiny_p_4)
    pPr = hdd_header_p.find(f'{{{W_NS}}}pPr')
    if pPr is None:
        pPr = ET.Element(f'{{{W_NS}}}pPr')
        hdd_header_p.insert(0, pPr)
    if pPr.find(f'{{{W_NS}}}pageBreakBefore') is None:
        pPr.append(ET.Element(f'{{{W_NS}}}pageBreakBefore'))

# Map ba_hdd_full on Lembar 5
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
                    print('ba_hdd_full successfully mapped on Page 5!')
                    break

# Akhir Dokumen (Lembar 5): hapus paragraf kosong setelah foto ba_hdd_full
hdd_full_p = None
for p in body.findall('.//w:p', {'w': W_NS}):
    for t in p.findall('.//w:t', {'w': W_NS}):
        if t.text and '{%foto_ba_hdd_full}' in t.text:
            hdd_full_p = p
            break
    if hdd_full_p is not None:
        break

if hdd_full_p is not None:
    full_p_pos = list(body).index(hdd_full_p)
    after_hdd = [el for el in list(body)[full_p_pos + 1:] if el.tag.endswith('p')]
    print(f'Removing {len(after_hdd)} empty paragraphs after foto_ba_hdd_full...')
    for p in after_hdd:
        body.remove(p)

# Bersihkan semua lastRenderedPageBreak dari dokumen
for parent in doc_root.iter():
    for child in list(parent):
        if child.tag == f'{{{W_NS}}}lastRenderedPageBreak':
            parent.remove(child)

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
