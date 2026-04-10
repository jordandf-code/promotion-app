// ai/renderPackageDeck.js
// Programmatic PPTX generation for promotion packages using JSZip.
// Generates a title slide + one content slide per section.

const JSZip = require('jszip');

// ── EMU constants ───────────────────────────────────────────────────────────
// 1 inch = 914400 EMU. Slide: 10" x 7.5"
const SLIDE_W = 9144000;
const SLIDE_H = 6858000;
const MARGIN  = 457200; // 0.5"

// ── XML escaping ────────────────────────────────────────────────────────────

function escapeXml(str) {
  if (typeof str !== 'string') return String(str ?? '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ── Section order and labels ────────────────────────────────────────────────

const SECTION_ORDER = [
  { key: 'executive_summary',     label: 'Executive Summary' },
  { key: 'scorecard_performance', label: 'Scorecard Performance' },
  { key: 'pipeline_outlook',      label: 'Pipeline Outlook' },
  { key: 'key_wins',              label: 'Key Wins' },
  { key: 'competency_assessment', label: 'Competency Assessment' },
  { key: 'brand_positioning',     label: 'Brand Positioning' },
  { key: 'readiness_assessment',  label: 'Readiness Assessment' },
  { key: 'eminence_leadership',   label: 'Eminence & Leadership' },
  { key: 'learning_development',  label: 'Learning & Development' },
  { key: 'people_network',        label: 'People Network' },
  { key: 'the_ask',              label: 'The Ask' },
];

// ── Build paragraph XML from text lines ─────────────────────────────────────

function textToParagraphs(text, fontSize, bold, color) {
  const lines = String(text || '').split('\n');
  return lines.map(line => {
    const escaped = escapeXml(line);
    const boldAttr = bold ? '<a:rPr lang="en-US" b="1" dirty="0">' : `<a:rPr lang="en-US" dirty="0">`;
    const colorXml = color ? `<a:solidFill><a:srgbClr val="${color}"/></a:solidFill>` : '';
    return `<a:p><a:r>${boldAttr.replace('>', colorXml + `<a:latin typeface="Calibri"/><a:cs typeface="Calibri"/>`)}<a:sz val="${fontSize * 100}"/></a:rPr><a:t>${escaped}</a:t></a:r></a:p>`;
  }).join('');
}

// ── Build a single paragraph run ────────────────────────────────────────────

function buildRun(text, fontSize, bold, color) {
  const escaped = escapeXml(text);
  const colorXml = color ? `<a:solidFill><a:srgbClr val="${color}"/></a:solidFill>` : '';
  return `<a:r><a:rPr lang="en-US"${bold ? ' b="1"' : ''} dirty="0"><a:latin typeface="Calibri"/><a:cs typeface="Calibri"/>${colorXml}<a:sz val="${fontSize * 100}"/></a:rPr><a:t>${escaped}</a:t></a:r>`;
}

// ── Slide XML builders ──────────────────────────────────────────────────────

function buildTitleSlide(userContext) {
  const name     = userContext?.name || userContext?.current_role || 'Candidate';
  const current  = userContext?.current_role || '';
  const target   = userContext?.target_role || '';
  const company  = userContext?.company || '';
  const date     = new Date().toLocaleDateString('en-CA');
  const subtitle = [current, target].filter(Boolean).join(' \u2192 ');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:cSld>
    <p:bg><p:bgPr><a:solidFill><a:srgbClr val="1B3A5C"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${SLIDE_W}" cy="${SLIDE_H}"/><a:chOff x="0" y="0"/><a:chExt cx="${SLIDE_W}" cy="${SLIDE_H}"/></a:xfrm></p:grpSpPr>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="2" name="Title"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="${MARGIN}" y="1828800"/><a:ext cx="${SLIDE_W - 2 * MARGIN}" cy="1371600"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr>
        <p:txBody>
          <a:bodyPr anchor="ctr"/>
          <a:lstStyle/>
          <a:p><a:pPr algn="ctr"/>
            ${buildRun('Promotion Case', 36, true, 'FFFFFF')}
          </a:p>
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="3" name="Name"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="${MARGIN}" y="3200400"/><a:ext cx="${SLIDE_W - 2 * MARGIN}" cy="914400"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr>
        <p:txBody>
          <a:bodyPr anchor="ctr"/>
          <a:lstStyle/>
          <a:p><a:pPr algn="ctr"/>${buildRun(name, 28, true, 'FFFFFF')}</a:p>
          <a:p><a:pPr algn="ctr"/>${buildRun(subtitle, 18, false, 'B0C4DE')}</a:p>
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="4" name="Footer"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="${MARGIN}" y="5486400"/><a:ext cx="${SLIDE_W - 2 * MARGIN}" cy="457200"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr>
        <p:txBody>
          <a:bodyPr anchor="ctr"/>
          <a:lstStyle/>
          <a:p><a:pPr algn="ctr"/>${buildRun(`${company}  |  ${date}`, 14, false, '8899AA')}</a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`;
}

function buildContentSlide(title, bodyText) {
  const titleBarH = 914400; // 1"

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${SLIDE_W}" cy="${SLIDE_H}"/><a:chOff x="0" y="0"/><a:chExt cx="${SLIDE_W}" cy="${SLIDE_H}"/></a:xfrm></p:grpSpPr>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="2" name="TitleBar"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
        <p:spPr>
          <a:xfrm><a:off x="0" y="0"/><a:ext cx="${SLIDE_W}" cy="${titleBarH}"/></a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
          <a:solidFill><a:srgbClr val="1B3A5C"/></a:solidFill>
        </p:spPr>
        <p:txBody>
          <a:bodyPr anchor="ctr" lIns="457200"/>
          <a:lstStyle/>
          <a:p>${buildRun(title, 24, true, 'FFFFFF')}</a:p>
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="3" name="Body"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
        <p:spPr>
          <a:xfrm><a:off x="${MARGIN}" y="${titleBarH + MARGIN / 2}"/><a:ext cx="${SLIDE_W - 2 * MARGIN}" cy="${SLIDE_H - titleBarH - MARGIN}"/></a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        </p:spPr>
        <p:txBody>
          <a:bodyPr wrap="square" lIns="91440" tIns="45720" rIns="91440" bIns="45720"/>
          <a:lstStyle/>
          ${textToParagraphs(bodyText, 11, false, '333333')}
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`;
}

// ── Minimal PPTX boilerplate XML ────────────────────────────────────────────

function contentTypesXml(slideCount) {
  let overrides = '';
  for (let i = 1; i <= slideCount; i++) {
    overrides += `<Override PartName="/ppt/slides/slide${i}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`;
  }
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
  <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
  <Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
  ${overrides}
</Types>`;
}

function rootRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`;
}

function presentationXml(slideCount) {
  let slideList = '';
  for (let i = 1; i <= slideCount; i++) {
    slideList += `<p:sldId id="${255 + i}" r:id="rId${i + 2}"/>`;
  }
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
                xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>
  <p:sldIdLst>${slideList}</p:sldIdLst>
  <p:sldSz cx="${SLIDE_W}" cy="${SLIDE_H}"/>
  <p:notesSz cx="${SLIDE_H}" cy="${SLIDE_W}"/>
</p:presentation>`;
}

function presentationRelsXml(slideCount) {
  let rels = `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>`;
  rels += `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>`;
  for (let i = 1; i <= slideCount; i++) {
    rels += `<Relationship Id="rId${i + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i}.xml"/>`;
  }
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels}</Relationships>`;
}

function slideRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>`;
}

function slideLayoutXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
             xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
             xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
             type="blank">
  <p:cSld><p:spTree>
    <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
    <p:grpSpPr/>
  </p:spTree></p:cSld>
</p:sldLayout>`;
}

function slideLayoutRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>`;
}

function slideMasterXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
             xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
             xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr/>
    </p:spTree>
  </p:cSld>
  <p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>
</p:sldMaster>`;
}

function slideMasterRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
</Relationships>`;
}

function themeXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="PromotionTheme">
  <a:themeElements>
    <a:clrScheme name="Custom">
      <a:dk1><a:srgbClr val="1B3A5C"/></a:dk1>
      <a:lt1><a:srgbClr val="FFFFFF"/></a:lt1>
      <a:dk2><a:srgbClr val="333333"/></a:dk2>
      <a:lt2><a:srgbClr val="F5F5F5"/></a:lt2>
      <a:accent1><a:srgbClr val="2563EB"/></a:accent1>
      <a:accent2><a:srgbClr val="16A34A"/></a:accent2>
      <a:accent3><a:srgbClr val="DC2626"/></a:accent3>
      <a:accent4><a:srgbClr val="F59E0B"/></a:accent4>
      <a:accent5><a:srgbClr val="8B5CF6"/></a:accent5>
      <a:accent6><a:srgbClr val="06B6D4"/></a:accent6>
      <a:hlink><a:srgbClr val="2563EB"/></a:hlink>
      <a:folHlink><a:srgbClr val="8B5CF6"/></a:folHlink>
    </a:clrScheme>
    <a:fontScheme name="Custom">
      <a:majorFont><a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont>
      <a:minorFont><a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont>
    </a:fontScheme>
    <a:fmtScheme name="Custom">
      <a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst>
      <a:lnStyleLst><a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst>
      <a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>
      <a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst>
    </a:fmtScheme>
  </a:themeElements>
</a:theme>`;
}

// ── Main render function ────────────────────────────────────────────────────

async function renderPackageDeck(sections, userContext) {
  const zip = new JSZip();

  // Determine which sections to include (in order)
  const includedSections = SECTION_ORDER.filter(s => sections[s.key]);
  const slideCount = 1 + includedSections.length; // title + content slides

  // Add structural files
  zip.file('[Content_Types].xml', contentTypesXml(slideCount));
  zip.file('_rels/.rels', rootRelsXml());
  zip.file('ppt/presentation.xml', presentationXml(slideCount));
  zip.file('ppt/_rels/presentation.xml.rels', presentationRelsXml(slideCount));

  // Slide master, layout, theme
  zip.file('ppt/slideMasters/slideMaster1.xml', slideMasterXml());
  zip.file('ppt/slideMasters/_rels/slideMaster1.xml.rels', slideMasterRelsXml());
  zip.file('ppt/slideLayouts/slideLayout1.xml', slideLayoutXml());
  zip.file('ppt/slideLayouts/_rels/slideLayout1.xml.rels', slideLayoutRelsXml());
  zip.file('ppt/theme/theme1.xml', themeXml());

  // Title slide
  zip.file('ppt/slides/slide1.xml', buildTitleSlide(userContext));
  zip.file('ppt/slides/_rels/slide1.xml.rels', slideRelsXml());

  // Content slides
  for (let i = 0; i < includedSections.length; i++) {
    const { key, label } = includedSections[i];
    const sectionData = sections[key];
    const bodyText = typeof sectionData === 'string' ? sectionData : (sectionData.polished || sectionData.raw || '');
    zip.file(`ppt/slides/slide${i + 2}.xml`, buildContentSlide(label, bodyText));
    zip.file(`ppt/slides/_rels/slide${i + 2}.xml.rels`, slideRelsXml());
  }

  return zip.generateAsync({ type: 'nodebuffer' });
}

module.exports = { renderPackageDeck };
