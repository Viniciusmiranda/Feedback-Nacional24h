// INTEGRATIONS LOGIC - BUBBLES & LOGS

async function loadIntegrations() {
    const container = document.getElementById('integrationsContainer');
    const addSection = document.getElementById('addIntegrationSection'); // We'll add this ID to the dropdown area
    container.innerHTML = '';

    // Hide "Add" section for clients (assuming all non-SaaS admins are clients for now)
    // The prompt says "o cliente sozinho não poderá adicionar integraçõess"
    // We can hide it via CSS or JS. Let's assume we hide it by default and only show if Saas Admin? 
    // Or just hide it completely for now as requested.
    if (addSection) addSection.style.display = 'none';

    try {
        const res = await fetch('/api/company/settings', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await res.json();

        let allowed = [];
        try {
            allowed = data.allowedIntegrations ? JSON.parse(data.allowedIntegrations) : [];
        } catch (e) { allowed = []; }

        if (allowed.length === 0) {
            container.innerHTML = '<p style="color: #666; width: 100%; text-align: center;">Nenhuma integração ativa.</p>';
            return;
        }

        allowed.forEach(type => {
            renderIntegrationBubble(container, type);
        });

    } catch (e) {
        console.error("Erro ao carregar integrações", e);
    }
}

function renderIntegrationBubble(container, type) {
    const config = {
        whatsapp: { name: 'WhatsApp', color: '#25D366', icon: 'images/whatsapp.png', isImg: true },
        lnassist: { name: 'LnAssist', color: '#ff9800', icon: '🩺', isImg: false }
    };

    const conf = config[type];
    if (!conf) return;

    const bubble = document.createElement('div');
    bubble.className = 'glass-panel integration-bubble';
    bubble.style.cssText = `
        width: 120px; 
        height: 120px; 
        display: flex; 
        flex-direction: column; 
        align-items: center; 
        justify-content: center; 
        cursor: pointer; 
        transition: transform 0.2s;
        margin: 10px;
    `;
    bubble.onmouseover = () => bubble.style.transform = 'scale(1.05)';
    bubble.onmouseout = () => bubble.style.transform = 'scale(1)';
    bubble.onclick = () => openIntegrationModal(type);

    let iconHtml = '';
    if (conf.isImg) {
        iconHtml = `<img src="${conf.icon}" style="width: 50px; height: 50px; margin-bottom: 10px;">`;
    } else {
        iconHtml = `<span style="font-size: 3rem; margin-bottom: 10px;">${conf.icon}</span>`;
    }

    bubble.innerHTML = `
        ${iconHtml}
        <span style="font-size: 0.9rem; font-weight: bold; color: #fff;">${conf.name}</span>
    `;

    container.appendChild(bubble);
}

// --- MODALS & LOGS ---

function openIntegrationModal(type) {
    const modal = document.getElementById('logsModal');
    const title = document.getElementById('logsModalTitle');
    const body = document.getElementById('logsTableBody');
    const header = document.getElementById('logsTableHeader');

    modal.style.display = 'flex';
    body.innerHTML = '<tr><td colspan="100%" style="text-align:center;">Carregando...</td></tr>';

    if (type === 'whatsapp') {
        title.innerText = 'Logs do WhatsApp';
        // Render Header
        header.innerHTML = `
            <th>ID</th>
            <th>Data/Hora</th>
            <th>Número</th>
            <th>Mensagem</th>
            <th>Obs</th>
        `;
        loadWhatsappLogs(body);
    } else if (type === 'lnassist') {
        title.innerText = 'Atendimentos LnAssist';
        header.innerHTML = `
            <th>Data/Hora</th>
            <th>ID</th>
            <th>Situação</th>
            <th>Associado</th>
            <th>Placa</th>
            <th>Associação</th>
            <th>Atendente</th>
            <th>Tel. Associado</th>
        `;
        loadLnAssistLogs(body);
    }
}

function closeLogsModal() {
    document.getElementById('logsModal').style.display = 'none';
}

async function loadWhatsappLogs(tbody) {
    try {
        const res = await fetch('/api/logs/whatsapp', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await res.json();

        tbody.innerHTML = '';
        if (data.logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="100%" style="text-align:center;">Nenhum registro encontrado.</td></tr>';
            return;
        }

        data.logs.forEach(log => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>#${log.id}</td>
                <td>${new Date(log.createdAt).toLocaleString()}</td>
                <td>${log.phone}</td>
                <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${log.message}">${log.message}</td>
                <td>${log.notes || '-'}</td>
            `;
            tbody.appendChild(tr);
        });

    } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="100%" style="text-align:center; color:red;">Erro ao carregar.</td></tr>';
    }
}

async function loadLnAssistLogs(tbody) {
    try {
        const res = await fetch('/api/logs/lnassist', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await res.json();

        tbody.innerHTML = '';
        if (data.logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="100%" style="text-align:center;">Nenhum registro encontrado.</td></tr>';
            return;
        }

        data.logs.forEach(log => {
            const tr = document.createElement('tr');
            // serviceDate might be null if not yet happened, or use createdAt
            const date = log.serviceDate ? new Date(log.serviceDate).toLocaleString() : '-';
            tr.innerHTML = `
                <td>${date}</td>
                <td>#${log.id}</td>
                <td>${log.status}</td>
                <td>${log.corporateName || '-'}</td>
                <td>${log.plate || '-'}</td>
                <td>${log.association || '-'}</td>
                <td>${log.attendant || '-'}</td>
                <td>${log.phone || '-'}</td>
            `;
            tbody.appendChild(tr);
        });

    } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="100%" style="text-align:center; color:red;">Erro ao carregar.</td></tr>';
    }
}
