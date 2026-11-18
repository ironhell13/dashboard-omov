import zipfile
import re
import xml.etree.ElementTree as ET

W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
ET.register_namespace('w', W_NS)

with zipfile.ZipFile('template/BA_TEMPLATE.docx', 'r') as z_in:
    doc_xml = z_in.read('word/document.xml')
    styles_xml = z_in.read('word/styles.xml')
    file_map = {name: z_in.read(name) for name in z_in.namelist()}

# 1. Update styles.xml to default Tahoma 9pt (18)
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

# 2. Update document.xml
doc_root = ET.fromstring(doc_xml)

# Update all existing fonts to Tahoma and size to 18
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

# Helper to build a clean aligned paragraph XML
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

# Build exact paragraph replacements
P4_xml = make_p_xml(
    r('Lokasi') + tab_colon() + r('{lokasi}') + br() +
    r('WSID') + tab_colon() + r('{wsid}')
)

P5_xml = make_p_xml(
    r('Alamat') + tab_colon() + r('{alamat}')
)

P6_xml = make_p_xml(
    r('Lokasi Lama') + tab_colon() + r('{lokasi_lama}')
)

P7_xml = make_p_xml(
    r('WSID Lama') + tab_colon() + r('{wsid_lama}')
)

P8_xml = make_p_xml(
    r('Type Mesin') + tab_colon() + r('{type_mesin_baru}')
)

P9_xml = make_p_xml(
    r('Serial Nomor') + tab_colon() + r('{serial_nomor}')
)

P10_xml = make_p_xml(
    r('Baru/Relokasi') + tab_colon() + r('{jenis_pekerjaan}') + br() +
    r('Tegangan Listrik (UPS-IT)') + tab_colon() + r('{tegangan_ups_it} Volt', space=True) +
    tab() + r('Grounding (UPS-IT)') + tab() + r(': {grounding_ups_it} Volt', space=True),
    tab1=3100, tab2=5600, tab3=7400
)

P11_xml = make_p_xml(
    r('Initial VSAT') + tab_colon() + r('{initial_vsat}')
)

P12_xml = make_p_xml(
    r('Konfigurasi') + tab_colon() + r('{konfigurasi}')
)

P13_xml = make_p_xml(
    r('IP Address') + tab_colon() + r('{ip_address}')
)

P14_xml = make_p_xml(
    r('Catridge') + tab_colon() + r('{cartridge}') + br() +
    r('Reject') + tab_colon() + r('{reject}') + br() +
    r('Kunci') + tab_colon() + r('{kunci}')
)

P15_xml = make_p_xml(
    r('Cencon') + tab_colon() + r('{cencon}')
)

P16_xml = make_p_xml(
    r('Kamera') + tab_colon() + r('{kamera}')
)

P17_xml = make_p_xml(
    r('Perekam') + tab_colon() + r('{perekam}')
)

P18_xml = make_p_xml(
    r('PIN Cover') + tab_colon() + r('{pin_cover}')
)

P19_xml = make_p_xml(
    r('FDI') + tab_colon() + r('{fdi}')
)

# P20: MasterKey Triple desk with strikethrough & alasan
P20_xml = make_p_xml(
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
)

P21_xml = make_p_xml(
    r('AC') + tab_colon() + r('{ac}')
)

P22_xml = make_p_xml(
    r('Outdoor') + tab_colon() + r('- Neon Sign') + tab() + r(': {neon_sign}', space=True),
    tab1=3100, tab2=4600
)

P23_xml = make_p_xml(
    tab() + r(': - Stiker Mesin', space=True) + tab() + r(': {stiker_mesin}', space=True),
    tab1=3100, tab2=4600
)

P24_xml = make_p_xml(
    r('Indoor') + tab_colon() + r('- Kabel Jalur') + tab() + r(': {kabel_jalur}', space=True),
    tab1=3100, tab2=4600
)

P25_xml = make_p_xml(
    r('Colokan Listrik') + tab_colon() + r('{colokan_listrik}')
)

P26_xml = make_p_xml(
    r('Perekam Eksternal') + tab_colon() + r('{perekam_eksternal_status} - Merk: {perekam_eksternal_merk}', space=True) +
    tab() + r('SN: {perekam_eksternal_sn}', space=True),
    tab1=3100, tab2=6800
)

P27_xml = make_p_xml(
    r('Kamera Eksternal') + tab_colon() + r('{kamera_eksternal_status} - Merk: {kamera_eksternal_merk}', space=True) +
    tab() + r('SN: {kamera_eksternal_sn}', space=True),
    tab1=3100, tab2=6800
)

P28_xml = make_p_xml(
    r('UPS') + tab_colon() + r('{ups_status} - Merk: {ups_merk}', space=True) +
    tab() + r('SN: {ups_sn}', space=True),
    tab1=3100, tab2=6800
)

P29_xml = make_p_xml(
    r('LED') + tab_colon() + r('{led_status} - Merk: {led_merk}', space=True) +
    tab() + r('SN: {led_sn}', space=True),
    tab1=3100, tab2=6800
)

P31_xml = make_p_xml(
    r('Letak Mesin') + tab_colon() + r('{letak_mesin}')
)

# P32: Pasang Pengaman Angkur with strikethrough & vendor
P32_xml = make_p_xml(
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
)

# P33: Jika Tidak harap info type pengaman pengganti with [X] / [ ] boxes
P33_xml = make_p_xml(
    r('Jika “Tidak” harap info type pengaman pengganti :  {pengaman_dynabolt_box} Dynabold   {pengaman_alarm_box} Alarm   Harap info alasan menggunakan Dynabold/Alarm : ', space=True) +
    r('{angkur_alasan}')
)

# P34: Pasang Supersite with strikethrough & vendor
P34_xml = make_p_xml(
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
)

# P36: Exhaust Fan & Alasan Supersite
P36_xml = make_p_xml(
    r('Exhaust Fan') + tab_colon() + r('{exhaust_fan_text}') +
    r('   Jika Tidak pasang supersite mohon alasannya : ', space=True) + r('{supersite_alasan}')
)

# P37: Tanggal Email Permintaan Mesin
P37_xml = make_p_xml(
    r('Tanggal Email Permintaan Mesin') + tab_colon() + r('{tanggal_email_permintaan}')
)

# P38: Clean empty paragraph
P38_xml = f'<w:p xmlns:w="{W_NS}"><w:pPr><w:spacing w:before="1" /><w:rPr><w:rFonts w:ascii="Tahoma" w:hAnsi="Tahoma" w:cs="Tahoma" /><w:sz w:val="18" /></w:rPr></w:pPr></w:p>'

# P40: Koordinat
P40_xml = make_p_xml(
    r('Koordinat') + tab_colon() + r('{koordinat_text}')
)

# P41: Kota & Tanggal
P41_xml = f'''<w:p xmlns:w="{W_NS}">
  <w:pPr>
    <w:spacing w:before="100" />
    <w:rPr>
      <w:rFonts w:ascii="Tahoma" w:hAnsi="Tahoma" w:cs="Tahoma" />
      <w:sz w:val="18" />
      <w:szCs w:val="18" />
    </w:rPr>
  </w:pPr>
  {r('{kota}, {tanggal_teks}')}
</w:p>'''

# Map targets
rep_map = {
    4: P4_xml,
    5: P5_xml,
    6: P6_xml,
    7: P7_xml,
    8: P8_xml,
    9: P9_xml,
    10: P10_xml,
    11: P11_xml,
    12: P12_xml,
    13: P13_xml,
    14: P14_xml,
    15: P15_xml,
    16: P16_xml,
    17: P17_xml,
    18: P18_xml,
    19: P19_xml,
    20: P20_xml,
    21: P21_xml,
    22: P22_xml,
    23: P23_xml,
    24: P24_xml,
    25: P25_xml,
    26: P26_xml,
    27: P27_xml,
    28: P28_xml,
    29: P29_xml,
    31: P31_xml,
    32: P32_xml,
    33: P33_xml,
    34: P34_xml,
    36: P36_xml,
    37: P37_xml,
    38: P38_xml,
    40: P40_xml,
    41: P41_xml,
}

paragraphs = doc_root.findall('.//w:p', {'w': W_NS})
body = doc_root.find('.//w:body', {'w': W_NS})

# Replace each target paragraph
for idx, xml_str in rep_map.items():
    old_p = paragraphs[idx]
    new_p = ET.fromstring(xml_str)
    # Find old_p in parent
    parent = None
    for p_elem in doc_root.iter():
        if old_p in list(p_elem):
            parent = p_elem
            break
    if parent is not None:
        p_list = list(parent)
        pos = p_list.index(old_p)
        parent.remove(old_p)
        parent.insert(pos, new_p)

# Save to template/BA_TEMPLATE.docx
file_map['word/document.xml'] = ET.tostring(doc_root, encoding='utf-8', xml_declaration=True)
file_map['word/styles.xml'] = styles_xml_updated

with zipfile.ZipFile('template/BA_TEMPLATE.docx', 'w', zipfile.ZIP_DEFLATED) as z_out:
    for name, content in file_map.items():
        z_out.writestr(name, content)

print("Rebuilt aligned template successfully!")
