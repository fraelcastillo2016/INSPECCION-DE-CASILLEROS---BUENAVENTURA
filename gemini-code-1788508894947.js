const state = {
    inspecciones: JSON.parse(localStorage.getItem('ciamsa_inspecciones')) || [],
    currentId: null,
    signatureCtx: null,
    chartEstadosInst: null,
    chartHallazgosInst: null
};

const sectoresPorArea = {
    "CIAMSA UNO": ["bodega 9", "bodega 9a", "edificio planta", "taller mantenimiento", "OTRO"],
    "CIAMSA DOS": ["patio uno", "patio dos", "patio tres", "bodega de importado", "sala de estibadores", "OTRO"],
    "OTRO": ["OTRO"]
};

document.addEventListener('DOMContentLoaded', () => {
    initSignatureCanvas();
    initFormEvents();
    initNavigation();
    initFilters();
    resetForm();
    renderHistorial();
});

function initNavigation() {
    const tabs = document.querySelectorAll('.nav-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.view-section').forEach(v => v.classList.add('hidden'));

            tab.classList.add('active');
            const target = tab.dataset.target;
            document.getElementById(target).classList.remove('hidden');

            if (target === 'historialView') renderHistorial();
            if (target === 'dashboardView') {
                populateDashSelect();
                renderDashboard();
            }
        });
    });
}

function initFilters() {
    const fFecha = document.getElementById('filterFecha');
    const fArea = document.getElementById('filterArea');
    const fInspector = document.getElementById('filterInspector');

    [fFecha, fArea, fInspector].forEach(elem => {
        elem.addEventListener('input', () => renderHistorial());
    });

    document.getElementById('dashFormSelect').addEventListener('change', () => renderDashboard());
}

function initSignatureCanvas() {
    const canvas = document.getElementById('signatureCanvas');
    const ctx = canvas.getContext('2d');
    state.signatureCtx = ctx;

    canvas.width = canvas.parentElement.clientWidth || 300;
    canvas.height = 70;

    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1.8;

    let drawing = false;
    function getCoords(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: clientX - rect.left, y: clientY - rect.top };
    }

    canvas.addEventListener('mousedown', (e) => { drawing = true; ctx.beginPath(); const p = getCoords(e); ctx.moveTo(p.x, p.y); });
    canvas.addEventListener('mousemove', (e) => { if (drawing) { const p = getCoords(e); ctx.lineTo(p.x, p.y); ctx.stroke(); } });
    window.addEventListener('mouseup', () => drawing = false);

    canvas.addEventListener('touchstart', (e) => { drawing = true; ctx.beginPath(); const p = getCoords(e); ctx.moveTo(p.x, p.y); });
    canvas.addEventListener('touchmove', (e) => { if (drawing) { const p = getCoords(e); ctx.lineTo(p.x, p.y); ctx.stroke(); } });
    canvas.addEventListener('touchend', () => drawing = false);

    document.getElementById('btnClearSignature').addEventListener('click', () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    });
}

function initFormEvents() {
    document.getElementById('btnAddFuncionario').addEventListener('click', () => addFuncionarioCard());
    document.getElementById('btnLimpiarForm').addEventListener('click', resetForm);

    const areaSel = document.getElementById('areaSelect');
    const sectorSel = document.getElementById('sectorSelect');

    areaSel.addEventListener('change', () => {
        const valArea = areaSel.value;
        sectorSel.innerHTML = '<option value="" disabled selected>-- Sector --</option>';

        if (sectoresPorArea[valArea]) {
            sectoresPorArea[valArea].forEach(sec => {
                const opt = document.createElement('option');
                opt.value = sec;
                opt.textContent = sec.toUpperCase();
                sectorSel.appendChild(opt);
            });
        }

        document.getElementById('areaOtroGroup').classList.toggle('hidden', valArea !== 'OTRO');
        document.getElementById('otrosAreaSectorGroup').classList.toggle('hidden', valArea !== 'OTRO' && sectorSel.value !== 'OTRO');
    });

    sectorSel.addEventListener('change', () => {
        document.getElementById('sectorOtroGroup').classList.toggle('hidden', sectorSel.value !== 'OTRO');
        document.getElementById('otrosAreaSectorGroup').classList.toggle('hidden', areaSel.value !== 'OTRO' && sectorSel.value !== 'OTRO');
    });

    const cargoSelect = document.getElementById('respCargoSelect');
    cargoSelect.addEventListener('change', () => {
        document.getElementById('respCargoOtroGroup').classList.toggle('hidden', cargoSelect.value !== 'OTRO');
    });

    document.getElementById('inspectionForm').addEventListener('submit', (e) => {
        e.preventDefault();
        saveInspection();
    });
}

function addFuncionarioCard(data = null) {
    const container = document.getElementById('funcionariosContainer');

    const card = document.createElement('div');
    card.className = 'func-card';
    card.innerHTML = `
        <div class="card-header">
            <h4>FUNCIONARIO</h4>
            <button type="button" class="btn btn-small btn-danger btn-remove-func">Quitar de Lista</button>
        </div>
        <div class="form-grid">
            <div class="form-group">
                <label>CASILLERO</label>
                <input type="text" class="f-casillero" value="${data ? data.casillero : ''}">
            </div>
            <div class="form-group">
                <label>NOMBRE USUARIO *</label>
                <input type="text" class="f-nombre" value="${data ? data.nombre : ''}" required>
            </div>
            <div class="form-group">
                <label>No. CÉDULA *</label>
                <input type="text" class="f-cedula" value="${data ? data.cedula : ''}" required>
            </div>
            <div class="form-group">
                <label>CARGO *</label>
                <input type="text" class="f-cargo" value="${data ? data.cargo : ''}" required>
            </div>
            <div class="form-group">
                <label>NOTA</label>
                <input type="text" class="f-nota" value="${data ? data.nota : ''}">
            </div>
        </div>

        <div class="form-group" style="margin-top:8px;">
            <label>REGISTRO FOTOGRÁFICO *</label>
            <input type="file" class="f-foto-input" accept="image/*" multiple style="margin-bottom:6px;">
            <div class="photo-gallery"></div>
        </div>

        <div class="form-group" style="margin-top:8px;">
            <label>FIRMA *</label>
            <div class="func-signature-wrapper compact-signature">
                <canvas class="func-signature-canvas"></canvas>
            </div>
            <button type="button" class="btn btn-small btn-light btn-clear-func-sig" style="margin-top:3px; width:90px;">Limpiar Firma</button>
        </div>
        <div class="form-group" style="margin-top:8px;">
            <label>OBSERVACIONES</label>
            <textarea class="f-obs ciamsa-textarea" rows="2">${data ? data.observaciones : ''}</textarea>
        </div>
    `;

    container.appendChild(card);

    const gallery = card.querySelector('.photo-gallery');
    const fotoInput = card.querySelector('.f-foto-input');

    fotoInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        if (gallery.children.length + files.length > 5) {
            alert("No puede incluir más de 5 fotos.");
            return;
        }

        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (evt) => {
                const thumb = document.createElement('div');
                thumb.className = 'photo-thumb';
                thumb.dataset.base64 = evt.target.result;
                thumb.innerHTML = `<img src="${evt.target.result}"><button type="button" class="btn-del-photo">&times;</button>`;
                thumb.querySelector('.btn-del-photo').addEventListener('click', () => thumb.remove());
                gallery.appendChild(thumb);
            };
            reader.readAsDataURL(file);
        });
    });

    if (data && data.fotos) {
        data.fotos.forEach(src => {
            const thumb = document.createElement('div');
            thumb.className = 'photo-thumb';
            thumb.dataset.base64 = src;
            thumb.innerHTML = `<img src="${src}"><button type="button" class="btn-del-photo">&times;</button>`;
            thumb.querySelector('.btn-del-photo').addEventListener('click', () => thumb.remove());
            gallery.appendChild(thumb);
        });
    }

    const canvas = card.querySelector('.func-signature-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.parentElement.clientWidth || 300;
    canvas.height = 70;
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1.8;

    let drawing = false;
    function getCoords(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: clientX - rect.left, y: clientY - rect.top };
    }

    canvas.addEventListener('mousedown', (e) => { drawing = true; ctx.beginPath(); const p = getCoords(e); ctx.moveTo(p.x, p.y); });
    canvas.addEventListener('mousemove', (e) => { if (drawing) { const p = getCoords(e); ctx.lineTo(p.x, p.y); ctx.stroke(); } });
    window.addEventListener('mouseup', () => drawing = false);

    canvas.addEventListener('touchstart', (e) => { drawing = true; ctx.beginPath(); const p = getCoords(e); ctx.moveTo(p.x, p.y); });
    canvas.addEventListener('touchmove', (e) => { if (drawing) { const p = getCoords(e); ctx.lineTo(p.x, p.y); ctx.stroke(); } });
    canvas.addEventListener('touchend', () => drawing = false);

    card.querySelector('.btn-clear-func-sig').addEventListener('click', () => ctx.clearRect(0, 0, canvas.width, canvas.height));
    card.querySelector('.btn-remove-func').addEventListener('click', () => card.remove());

    if (data && data.firma) {
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0);
        img.src = data.firma;
    }
}

function saveInspection() {
    const id = state.currentId || 'FORSE032-' + Date.now().toString().slice(-6);
    const areaSel = document.getElementById('areaSelect').value;
    const sectorSel = document.getElementById('sectorSelect').value;

    const record = {
        id: id,
        fecha: document.getElementById('fecha').value,
        hora: document.getElementById('hora').value,
        losSenores: document.getElementById('losSenoresResp').value,
        area: areaSel === 'OTRO' ? document.getElementById('areaOtro').value : areaSel,
        areaRaw: areaSel,
        sector: sectorSel === 'OTRO' ? document.getElementById('sectorOtro').value : sectorSel,
        sectorRaw: sectorSel,
        genVerifs: {
            v1: document.getElementById('gen_v1').value,
            v2: document.getElementById('gen_v2').value,
            v3: document.getElementById('gen_v3').value,
            v4: document.getElementById('gen_v4').value,
            v5: document.getElementById('gen_v5').value,
            v6: document.getElementById('gen_v6').value,
        },
        obsGenerales: document.getElementById('obsGenerales').value,
        responsable: {
            nombre: document.getElementById('respNombre').value,
            cedula: document.getElementById('respCedula').value,
            cargo: document.getElementById('respCargoSelect').value === 'OTRO' ? document.getElementById('respCargoOtro').value : document.getElementById('respCargoSelect').value,
            cargoRaw: document.getElementById('respCargoSelect').value,
            firma: document.getElementById('signatureCanvas').toDataURL()
        },
        estado: document.getElementById('estadoInspeccion').value,
        funcionarios: []
    };

    document.querySelectorAll('.func-card').forEach(card => {
        const fotos = [];
        card.querySelectorAll('.photo-thumb').forEach(thumb => fotos.push(thumb.dataset.base64));

        record.funcionarios.push({
            casillero: card.querySelector('.f-casillero').value,
            nombre: card.querySelector('.f-nombre').value,
            cedula: card.querySelector('.f-cedula').value,
            cargo: card.querySelector('.f-cargo').value,
            nota: card.querySelector('.f-nota').value,
            firma: card.querySelector('.func-signature-canvas').toDataURL(),
            observaciones: card.querySelector('.f-obs').value,
            fotos: fotos
        });
    });

    const index = state.inspecciones.findIndex(i => i.id === id);
    if (index >= 0) state.inspecciones[index] = record;
    else state.inspecciones.push(record);

    localStorage.setItem('ciamsa_inspecciones', JSON.stringify(state.inspecciones));
    alert(record.estado === 'Completado' ? 'Formulario Completado y Guardado.' : 'Borrador Guardado en Historial.');

    resetForm();
    renderHistorial();
}

function resetForm() {
    state.currentId = null;
    document.getElementById('inspectionForm').reset();
    document.getElementById('funcionariosContainer').innerHTML = '';

    const now = new Date();
    document.getElementById('fecha').value = now.toISOString().split('T')[0];
    document.getElementById('hora').value = now.toTimeString().slice(0, 5);

    addFuncionarioCard();

    if (state.signatureCtx) {
        state.signatureCtx.clearRect(0, 0, 500, 200);
    }
}

function cargarEnFormulario(id) {
    const item = state.inspecciones.find(i => i.id === id);
    if (!item) return;

    state.currentId = item.id;
    document.getElementById('fecha').value = item.fecha;
    document.getElementById('hora').value = item.hora;
    document.getElementById('losSenoresResp').value = item.losSenores;

    document.getElementById('areaSelect').value = item.areaRaw || 'OTRO';
    document.getElementById('areaSelect').dispatchEvent(new Event('change'));

    document.getElementById('sectorSelect').value = item.sectorRaw || 'OTRO';
    if (item.sectorRaw === 'OTRO') document.getElementById('sectorOtro').value = item.sector;

    document.getElementById('gen_v1').value = item.genVerifs.v1;
    document.getElementById('gen_v2').value = item.genVerifs.v2;
    document.getElementById('gen_v3').value = item.genVerifs.v3;
    document.getElementById('gen_v4').value = item.genVerifs.v4;
    document.getElementById('gen_v5').value = item.genVerifs.v5;
    document.getElementById('gen_v6').value = item.genVerifs.v6;

    document.getElementById('obsGenerales').value = item.obsGenerales;

    document.getElementById('respNombre').value = item.responsable.nombre;
    document.getElementById('respCedula').value = item.responsable.cedula;
    document.getElementById('respCargoSelect').value = item.responsable.cargoRaw || 'OTRO';
    document.getElementById('estadoInspeccion').value = item.estado;

    document.getElementById('funcionariosContainer').innerHTML = '';
    item.funcionarios.forEach(f => addFuncionarioCard(f));

    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('[data-target="nuevoFormView"]').classList.add('active');
    document.querySelectorAll('.view-section').forEach(v => v.classList.add('hidden'));
    document.getElementById('nuevoFormView').classList.remove('hidden');
}

function renderHistorial() {
    const tblBody = document.getElementById('tblHistorialBody');
    tblBody.innerHTML = '';

    const filterF = document.getElementById('filterFecha').value;
    const filterA = document.getElementById('filterArea').value.toLowerCase();
    const filterI = document.getElementById('filterInspector').value.toLowerCase();

    const filtered = state.inspecciones.filter(item => {
        const matchFecha = !filterF || item.fecha === filterF;
        const matchArea = !filterA || item.area.toLowerCase().includes(filterA);
        const matchInspector = !filterI || item.responsable.nombre.toLowerCase().includes(filterI);
        return matchFecha && matchArea && matchInspector;
    });

    filtered.forEach(item => {
        const tr = document.createElement('tr');
        const isCompleted = item.estado === 'Completado';
        const badgeClass = isCompleted ? 'badge-completed' : 'badge-pending';

        tr.innerHTML = `
            <td><strong>${item.id}</strong></td>
            <td>${item.fecha}</td>
            <td>${item.area} / ${item.sector}</td>
            <td>${item.responsable.nombre}</td>
            <td><span class="badge ${badgeClass}">${item.estado}</span></td>
            <td>
                <button class="btn btn-small btn-primary" onclick="cargarEnFormulario('${item.id}')">✏️ Editar / Ver</button>
                ${isCompleted ? `<button class="btn btn-small btn-success" onclick="imprimirPDF('${item.id}')">🖨️ PDF</button>` : ''}
            </td>
        `;

        tblBody.appendChild(tr);
    });
}

function imprimirPDF(id) {
    cargarEnFormulario(id);
    window.print();
}

function populateDashSelect() {
    const sel = document.getElementById('dashFormSelect');
    sel.innerHTML = '<option value="TODOS">-- Ver Todos los Registros --</option>';

    state.inspecciones.forEach(i => {
        const opt = document.createElement('option');
        opt.value = i.id;
        opt.textContent = `${i.id} - ${i.fecha} (${i.area})`;
        sel.appendChild(opt);
    });
}

function renderDashboard() {
    const selectedId = document.getElementById('dashFormSelect').value;
    let data = state.inspecciones;

    if (selectedId !== 'TODOS') {
        data = data.filter(i => i.id === selectedId);
    }

    const total = data.length;
    const completadas = data.filter(i => i.estado === 'Completado').length;
    const pendientes = total - completadas;

    let totalHallazgos = 0;
    const hallazgosContador = { 'Orden y Aseo': 0, 'Olores': 0, 'Humedad': 0, 'Roedores': 0, 'Mat. Ajenos': 0, 'Otros': 0 };

    data.forEach(item => {
        if (item.genVerifs) {
            if (item.genVerifs.v1 === 'NO') { hallazgosContador['Orden y Aseo']++; totalHallazgos++; }
            if (item.genVerifs.v2 === 'SI') { hallazgosContador['Olores']++; totalHallazgos++; }
            if (item.genVerifs.v3 === 'SI') { hallazgosContador['Humedad']++; totalHallazgos++; }
            if (item.genVerifs.v4 === 'SI') { hallazgosContador['Roedores']++; totalHallazgos++; }
            if (item.genVerifs.v5 === 'SI') { hallazgosContador['Mat. Ajenos']++; totalHallazgos++; }
            if (item.genVerifs.v6 === 'SI') { hallazgosContador['Otros']++; totalHallazgos++; }
        }
    });

    document.getElementById('kpiTotal').innerText = total;
    document.getElementById('kpiCompletadas').innerText = completadas;
    document.getElementById('kpiPendientes').innerText = pendientes;
    document.getElementById('kpiHallazgos').innerText = totalHallazgos;

    if (state.chartEstadosInst) state.chartEstadosInst.destroy();
    if (state.chartHallazgosInst) state.chartHallazgosInst.destroy();

    const ctx1 = document.getElementById('chartEstados').getContext('2d');
    state.chartEstadosInst = new Chart(ctx1, {
        type: 'doughnut',
        data: {
            labels: ['Completadas', 'Pendientes'],
            datasets: [{ data: [completadas, pendientes], backgroundColor: ['#70AD47', '#ffc107'] }]
        }
    });

    const ctx2 = document.getElementById('chartHallazgos').getContext('2d');
    state.chartHallazgosInst = new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: Object.keys(hallazgosContador),
            datasets: [{ label: 'Nº Inconformidades', data: Object.values(hallazgosContador), backgroundColor: '#dc3545' }]
        },
        options: { scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
    });
}