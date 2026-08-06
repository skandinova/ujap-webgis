const map = L.map('map').setView([32.3252, 36.3678], 18);

L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  maxZoom: 24,
  maxNativeZoom: 18,
  attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics'
}).addTo(map);

L.tileLayer('http://127.0.0.1:8000/tiles/{z}/{x}/{y}.jpg', {
  maxZoom: 24,
  maxNativeZoom: 21,
  attribution: 'UJAP 2014 Orthophoto by Ivan LaBianca'
}).addTo(map);

fetch('http://127.0.0.1:8000/sync')
  .then(r => r.json())
  .then(() => {
    return Promise.all([
      fetch('http://127.0.0.1:8000/layers/areas').then(r => r.json()),
      fetch('http://127.0.0.1:8000/layers/buildings').then(r => r.json()),
      fetch('http://127.0.0.1:8000/layers/trenches').then(r => r.json()),
      fetch('http://127.0.0.1:8000/layers/contexts').then(r => r.json()),
      fetch('http://127.0.0.1:8000/tables/vocab_terms').then(r => r.json())
    ]);
  })
  .then(([areasData, buildingsData, trenchesData, contextsData, vocabTermsData]) => {
    document.getElementById('loading').style.display = 'none';

    function buildLookup(rows, idField, labelField) {
      const lookup = {};
      rows.forEach(row => {
        lookup[row[idField]] = row[labelField];
      });
      return lookup;
    }

    function formatEDTF(edtfString) {
      if (!edtfString) return null;
      try {
        const parsed = EDTF.parse(edtfString);
        return EDTF.toEDTF ? edtfString : new Date(parsed.min).toLocaleDateString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric'
        });
      } catch (err) {
        console.warn('Could not parse EDTF date:', edtfString, err);
        return edtfString;
      }
    }

    const contextFieldGroups = {
      common: [
        { key: 'trench_id', label: 'Trench', type: 'trench' },
        { key: 'geom_confidence_id', label: 'Spatial Confidence' },
        { key: 'justification', label: 'New Context Justification', type: 'raw' },
        { key: 'recording_condition_id', label: 'Recording Condition(s)', multi: true }
      ],
      925: [
        { key: 'excavation_method_id', label: 'Excavation Method(s)', type: 'vocab-code', multi: true },
        { key: 'excavation_tool_id', label: 'Excavation Tool(s)', multi: true },
        { key: 'was_sifted', label: 'Sifted?', type: 'raw' },
        { key: 'sifted_percentage', label: 'Percentage Sifted', type: 'raw' },
        { key: 'deposit_color_id', label: 'Color' },
        { key: 'deposit_color_confidence_id', label: 'Color Confidence' },
        { key: 'deposit_composition_id', label: 'Composition' },
        { key: 'deposit_composition_confidence_id', label: 'Composition Confidence' },
        { key: 'deposit_slope_direction_id', label: 'Slope Direction' },
        { key: 'deposit_slope_degree_id', label: 'Slope Degree' },
        { key: 'deposit_slope_confidence_id', label: 'Slope Confidence' },
        { key: 'deposit_compaction_id', label: 'Compaction' },
        { key: 'deposit_compaction_confidence_id', label: 'Compaction Confidence' }
      ],
      926: [
        { key: 'cut_shape_plan_id', label: 'Shape (Plan)' },
        { key: 'cut_linear_orientation_id', label: 'Linear Orientation' },
        { key: 'cut_shape_sides_id', label: 'Shape (Sides)' },
        { key: 'cut_shape_base_id', label: 'Shape (Base)' },
        { key: 'cut_shape_confidence_id', label: 'Shape Confidence' },
        { key: 'cut_slope_break_top_id', label: 'Slope Break (Top)' },
        { key: 'cut_slope_break_bottom_id', label: 'Slope Break (Bottom)' },
        { key: 'cut_slope_break_confidence_id', label: 'Slope Break Confidence' },
        { key: 'cut_measure_unit_id', label: 'Measurement Unit' },
        { key: 'cut_measure_method_id', label: 'Measurement Method', multi: true },
        { key: 'cut_measure_instrument_id', label: 'Measurement Instrument', multi: true },
        { key: 'cut_measure_length_value', label: 'Length', type: 'raw' },
        { key: 'cut_measure_width_value', label: 'Width', type: 'raw' },
        { key: 'cut_measure_depth_value', label: 'Depth', type: 'raw' },
        { key: 'cut_measure_confidence_id', label: 'Measurement Confidence' }
      ],
      927: [
        { key: 'architectural_was_excavated_or_removed', label: 'Excavated / Removed?', type: 'raw' },
        { key: 'architectural_type_id', label: 'Architectural Feature Type' },
        { key: 'architectural_type_confidence_id', label: 'Type Confidence' },
        { key: 'architectural_part_of_building', label: 'Part of Building?', type: 'raw' },
        { key: 'architectural_building_id', label: 'Building', type: 'building' },
        { key: 'architectural_part_of_building_confidence_id', label: 'Part of Building Confidence' },
        { key: 'architectural_measure_unit_id', label: 'Measurement Unit' },
        { key: 'architectural_measure_method_id', label: 'Measurement Method', multi: true },
        { key: 'architectural_measure_instrument_id', label: 'Measurement Instrument', multi: true },
        { key: 'architectural_measure_length_value', label: 'Length', type: 'raw' },
        { key: 'architectural_measure_width_value', label: 'Width', type: 'raw' },
        { key: 'architectural_measure_height_value', label: 'Height', type: 'raw' },
        { key: 'architectural_measure_confidence_id', label: 'Measurement Confidence' },
        { key: 'architectural_courses_count', label: 'Courses Count', type: 'raw' },
        { key: 'architectural_interior_exterior_id', label: 'Interior / Exterior' },
        { key: 'architectural_facing_direction_id', label: 'Facing Direction' },
        { key: 'architectural_stone_finish_id', label: 'Stone Finish', multi: true },
        { key: 'architectural_masonry_style_id', label: 'Masonry Style', multi: true },
        { key: 'architectural_masonry_technique_id', label: 'Masonry Technique', multi: true },
        { key: 'architectural_special_features_id', label: 'Special Features', multi: true },
        { key: 'architectural_bonding_material_id', label: 'Bonding Material', multi: true },
        { key: 'architectural_building_material_id', label: 'Building Material', multi: true },
        { key: 'architectural_bonding_material_sampled', label: 'Bonding Material Sampled?', type: 'raw' },
        { key: 'architectural_sample_ID', label: 'Bonding Material Sample', type: 'sample' }
      ]
    };

    const interpretationFields = [
      { key: 'initial_formation_process_id', label: 'Initial Formation Process' },
      { key: 'initial_formation_period_id', label: 'Initial Formation Period(s)', multi: true },
      { key: 'initial_formation_confidence_id', label: 'Initial Formation Confidence' },
      { key: 'modification_process_id', label: 'Later Modification Process(es)', multi: true },
      { key: 'modification_period_id', label: 'Modification Period(s)', multi: true },
      { key: 'modification_confidence_id', label: 'Modification Confidence' },
      { key: 'destruction_process_id', label: 'Destruction Process' },
      { key: 'destruction_period_id', label: 'Destruction Period(s)', multi: true },
      { key: 'destruction_confidence_id', label: 'Destruction Confidence' }
    ];

    const metadataFields = [
      { key: 'created_at', label: 'Created At', type: 'raw' },
      { key: 'created_by', label: 'Created By', type: 'raw' },
      { key: 'updated_at', label: 'Updated At', type: 'raw' },
      { key: 'updated_by', label: 'Updated By', type: 'raw' }
    ];

    const relatedTableColumns = {
      pails: [
        { key: 'pail_code', label: 'Code' },
        { key: 'description', label: 'Description' }
      ],
      samples: [
        { key: 'sample_code', label: 'Code' },
        { key: 'sample_type_id', label: 'Type' },
        { key: 'pail_id', label: 'Pail' },
        { key: 'description', label: 'Description' }
      ],
      artifacts: [
        { key: 'artifact_code', label: 'Code' },
        { key: 'artifact_type_id', label: 'Type' },
        { key: 'pail_id', label: 'Pail' },
        { key: 'description', label: 'Description' }
      ],
      ecofacts: [
        { key: 'ecofact_code', label: 'Code' },
        { key: 'ecofact_type_id', label: 'Type' },
        { key: 'taxon_id', label: 'Taxon' },
        { key: 'pail_id', label: 'Pail' },
        { key: 'description', label: 'Description' }
      ]
    };

    const vocabTermsLookup = buildLookup(vocabTermsData, 'id', 'label');
    const vocabCodeLookup = buildLookup(vocabTermsData, 'id', 'code');
    const trenchLookup = buildLookup(trenchesData.features.map(f => f.properties), 'id', 'trench_code');
    const buildingLookup = buildLookup(buildingsData.features.map(f => f.properties), 'id', 'building_code');

    function resolveValue(value) {
      if (value === null || value === undefined || value === '') return '—';
      return vocabTermsLookup[value] ?? value;
    }

    function parsePgArray(value) {
      if (typeof value !== 'string') return null;
      const trimmed = value.trim();
      if (!(trimmed.startsWith('{') && trimmed.endsWith('}'))) return null;
      const inner = trimmed.slice(1, -1).trim();
      return inner === '' ? [] : inner.split(',').map(s => s.trim());
    }

    function resolveSingle(fieldConfig, value, dynamicLookups) {
      switch (fieldConfig.type) {
        case 'raw': return value;
        case 'vocab-code': return vocabCodeLookup[value] ?? value;
        case 'trench': return trenchLookup[value] ?? value;
        case 'building': return buildingLookup[value] ?? value;
        case 'sample': return (dynamicLookups.sample && dynamicLookups.sample[value]) ?? value;
        default: return vocabTermsLookup[value] ?? value;
      }
    }

    function resolveField(fieldConfig, rawValue, dynamicLookups) {
      if (rawValue === null || rawValue === undefined || rawValue === '') return '—';

      if (fieldConfig.multi) {
        const ids = parsePgArray(rawValue);
        if (ids !== null) {
          return ids.length === 0 ? '—' : ids.map(id => resolveSingle(fieldConfig, id, dynamicLookups)).join(', ');
        }
      }

      return resolveSingle(fieldConfig, rawValue, dynamicLookups);
    }

    function renderFieldTable(feature, typeId, dynamicLookups) {
      const p = feature.properties;
      const fields = [
        ...contextFieldGroups.common,
        ...(contextFieldGroups[typeId] || []),
        ...interpretationFields,
        ...metadataFields
      ];
      let rows = fields.map(f => `<tr><td>${f.label}</td><td>${resolveField(f, p[f.key], dynamicLookups)}</td></tr>`).join('');
      return `<table class="detail-table"><tbody>${rows}</tbody></table>`;
    }

    function renderRelatedTable(records, columns, pailLookup) {
      if (!records || records.length === 0) return '<p><i>None recorded</i></p>';
      const header = columns.map(c => `<th>${c.label}</th>`).join('');
      const rows = records.map(r => {
        const cells = columns.map(c => {
          let value;
          if (c.key === 'pail_id') {
            value = pailLookup[r[c.key]] ?? r[c.key] ?? '—';
          } else {
            value = resolveValue(r[c.key]);
          }
          return `<td>${value}</td>`;
        }).join('');
        return `<tr>${cells}</tr>`;
      }).join('');
      return `<table class="detail-table"><thead><tr>${header}</tr></thead><tbody>${rows}</tbody></table>`;
    }

    async function openContextDetails(feature) {
      const p = feature.properties;
      const contextId = p.id;
      const typeId = p.context_type_id;

      const panel = document.getElementById('detail-panel');
      const content = document.getElementById('detail-content');
      content.innerHTML = '<p>Loading details...</p>';
      panel.classList.add('open');

      const [pails, samples, artifacts, ecofacts] = await Promise.all([
        fetch(`http://127.0.0.1:8000/tables/pails?context_id=${contextId}`).then(r => r.json()),
        fetch(`http://127.0.0.1:8000/tables/samples?context_id=${contextId}`).then(r => r.json()),
        fetch(`http://127.0.0.1:8000/tables/artifacts?context_id=${contextId}`).then(r => r.json()),
        fetch(`http://127.0.0.1:8000/tables/ecofacts?context_id=${contextId}`).then(r => r.json())
      ]);

      const pailLookup = {};
      pails.forEach(p => { pailLookup[p.id] = p.pail_code; });

      const sampleLookup = buildLookup(samples, 'id', 'sample_code');

      content.innerHTML = `
        <h3>${p.context_code}</h3>
        <p>${p.name}</p>
        ${renderFieldTable(feature, typeId, { sample: sampleLookup })}

        <div class="detail-section-title">Pails</div>
        ${renderRelatedTable(pails, relatedTableColumns.pails, pailLookup)}

        <div class="detail-section-title">Samples</div>
        ${renderRelatedTable(samples, relatedTableColumns.samples, pailLookup)}

        <div class="detail-section-title">Artifacts</div>
        ${renderRelatedTable(artifacts, relatedTableColumns.artifacts, pailLookup)}

        <div class="detail-section-title">Ecofacts</div>
        ${renderRelatedTable(ecofacts, relatedTableColumns.ecofacts, pailLookup)}
      `;
    }

    const areasStyle = { color: 'violet', weight: 3, fillOpacity: 0.1 };

    const areasLayer = L.geoJSON(areasData, {
      style: areasStyle,
      onEachFeature: (feature, layer) => {
        const p = feature.properties;
        layer.bindPopup(`<b>Area: ${p.area_code}</b><br>${p.description ?? ''}`);
      }
    });

    const buildingsStyle = { color: 'purple', weight: 2, fillColor: 'black', fillOpacity: 0.2 };

    const buildingsLayer = L.geoJSON(buildingsData, {
      style: buildingsStyle,
      onEachFeature: (feature, layer) => {
        const p = feature.properties;
        const bTypeLabel = vocabTermsLookup[p.building_type_id] ?? `${p.building_type_id}`;
        layer.bindPopup(`<b>${p.name}</b><br>${bTypeLabel}<br>${p.description ?? ''}`);
      }
    }).addTo(map);

    const trenchesStyle = { color: 'black', weight: 2, fillColor: 'purple', fillOpacity: 0.3 };

    const trenchesLayer = L.geoJSON(trenchesData, {
      style: trenchesStyle,
      onEachFeature: (feature, layer) => {
        const p = feature.properties;
        layer.bindPopup(`<b>${p.name}</b><br>${p.description ?? ''}`);
      }
    }).addTo(map);

    const contextTypeStyles = {
      926: { fillColor: '#000000', fillOpacity: 0.5, color: '#225522', weight: 2, dashArray: '4' },
      927: { fillColor: '#229922', fillOpacity: 0.5, color: '#225522', weight: 2 },
      925: { fillColor: '#88EE22', fillOpacity: 0.3, color: '#020202', weight: 2 }
    };

    const defaultContextStyle = { fillColor: '#999999', fillOpacity: 0.3, color: '#333333', weight: 1 };

    const contextsLayer = L.geoJSON(contextsData, {
      style: feature => contextTypeStyles[feature.properties.context_type_id] || defaultContextStyle,
      onEachFeature: (feature, layer) => {
        const p = feature.properties;
        const cTypeLabel = vocabTermsLookup[p.context_type_id] ?? `${p.context_type_id}`;

        let popupContent = `<b>${p.context_code}</b><br>${cTypeLabel}<br>${p.name}<br>${p.description ?? ''}`;

        const earliest = p.initial_formation_earliest_date;
        const latest = p.initial_formation_latest_date;

        if (earliest && latest) {
          const earliestDisplay = formatEDTF(earliest);
          const latestDisplay = formatEDTF(latest);
          popupContent += `<br><b>Date range:</b> ${earliestDisplay} - ${latestDisplay}`;

          if (p.interpretation_dating_notes) {
            popupContent += `<br><b>Dating notes:</b> ${p.interpretation_dating_notes}`;
          }
        }

        layer.bindPopup(popupContent + `<br><a href="#" class="view-details-link">View Details</a>`);

        layer.on('popupopen', () => {
          const link = document.querySelector('.leaflet-popup .view-details-link');
          if (link) {
            link.addEventListener('click', (e) => {
              e.preventDefault();
              openContextDetails(feature);
            });
          }
        });

        layer.bindTooltip(p.context_code, {
          permanent: true,
          direction: 'center',
          className: 'context-label'
        });
      }
    }).addTo(map);

    L.control.layers(null, {
      'Areas': areasLayer,
      'Buildings': buildingsLayer,
      'Trenches': trenchesLayer,
      'Contexts': contextsLayer
    }).addTo(map);

    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = function () {
      const div = L.DomUtil.create('div', 'legend');
      div.style.background = 'white';
      div.style.padding = '8px';
      div.style.borderRadius = '4px';
      div.style.maxWidth = '200px';
      div.style.fontSize = '12px';

      function swatch(style) {
        const fillColor = style.fillColor || style.color;
        const fillOpacity = style.fillOpacity ?? 1;
        return `<span style="
          display:inline-block;
          width:14px;
          height:14px;
          background:${fillColor};
          opacity:${fillOpacity};
          border:${style.weight}px solid ${style.color};
          margin-right:6px;
          vertical-align:middle;
        "></span>`;
      }

      let html = '';

      html += '<b>Areas</b><br>';
      html += `${swatch(areasStyle)} Area<br>`;

      html += '<b>Buildings</b><br>';
      html += `${swatch(buildingsStyle)} Building<br>`;

      html += '<b>Trenches</b><br>';
      html += `${swatch(trenchesStyle)} Trench<br>`;

      html += '<b>Context Types</b><br>';
      Object.entries(contextTypeStyles).forEach(([typeId, style]) => {
        const label = vocabTermsLookup[typeId] ?? `Type ${typeId}`;
        html += `${swatch(style)} ${label}<br>`;
      });

      div.innerHTML = html;
      return div;
    };
    legend.addTo(map);

    document.getElementById('detail-close').addEventListener('click', () => {
      document.getElementById('detail-panel').classList.remove('open');
    });
  })
  .catch(err => {
    document.getElementById('loading').textContent = 'Failed to sync - showing may be outdated.';
    console.error('Failed to load layers:', err);
  });