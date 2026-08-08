const TARGET_CORPUS = 20000000; // 2.0 Crore (નવો ટાર્ગેટ)
const ANNUAL_REAL_RATE = 0.055; // 5.5% (રિયલ રિટર્ન)
const MONTHLY_RATE = ANNUAL_REAL_RATE / 12;

// 2. LocalStorage Backup: Page Refresh પર Data ના જાય તે માટે
let ledger = JSON.parse(localStorage.getItem('artha_lakshya_ledger')) || [];

// DOM Elements
const entryForm = document.getElementById('entry-form');
const ledgerBody = document.getElementById('ledger-body');
const targetDateEl = document.getElementById('target-date');
const rollingAvgEl = document.getElementById('rolling-avg');
const totalInvestedEl = document.getElementById('total-invested');
const emptyStateEl = document.getElementById('empty-state');

// ડેટા બ્રાઉઝરમાં કાયમી સેવ કરવા માટે
function saveData() {
    localStorage.setItem('artha_lakshya_ledger', JSON.stringify(ledger));
}

// રકમને ભારતીય ચલણ (₹) ફોર્મેટમાં બતાવવા માટે
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount);
}

function updateDashboard() {
    // ડેટાને તારીખ મુજબ ગોઠવો
    ledger.sort((a, b) => new Date(a.month) - new Date(b.month));

    // અત્યાર સુધીનું કુલ રોકાણ (Total Invested)
    const totalInvested = ledger.reduce((sum, entry) => sum + parseFloat(entry.invested), 0);
    totalInvestedEl.textContent = formatCurrency(totalInvested);

    // 3. Target Date Logic: છેલ્લા 6 મહિનાની સરેરાશ (Rolling Avg) કાઢવી
    const lastMonths = ledger.slice(-6);
    const pmt = lastMonths.length > 0 
        ? lastMonths.reduce((sum, entry) => sum + parseFloat(entry.invested), 0) / lastMonths.length 
        : 0;
        
    rollingAvgEl.textContent = formatCurrency(pmt);

    if (pmt <= 0) {
        targetDateEl.textContent = "--";
        return;
    }

    const pv = totalInvested; // અત્યાર સુધી જમા થયેલ રકમ
    const fv = TARGET_CORPUS; // લક્ષ્યાંક (2 કરોડ)

    // બાકીના મહિના ગણવાનું અલ્ગોરિધમ (TVM સાથે, જેથી 5.5% વળતરની પણ ગણતરી થાય)
    const r = MONTHLY_RATE;
    const numerator = Math.log((fv * r + pmt) / (pv * r + pmt));
    const denominator = Math.log(1 + r);

    // જો લક્ષ્ય પૂર્ણ થઈ ગયું હોય
    if (numerator <= 0 || isNaN(numerator) || pv >= fv) {
        targetDateEl.textContent = "GOAL REACHED!";
        targetDateEl.classList.add('text-green-400');
        return;
    }

    const nMonths = Math.ceil(numerator / denominator);
    
    // આજની તારીખમાં તે બાકીના મહિના (nMonths) ઉમેરીને નવી તારીખ કાઢવી
    const targetDate = new Date();
    targetDate.setMonth(targetDate.getMonth() + nMonths);
    const options = { month: 'short', year: 'numeric' };
    
    targetDateEl.textContent = targetDate.toLocaleDateString('en-IN', options).toUpperCase();
    targetDateEl.classList.remove('text-green-400');
}

function renderLedger() {
    ledgerBody.innerHTML = '';
    
    if (ledger.length === 0) {
        emptyStateEl.classList.remove('hidden');
    } else {
        emptyStateEl.classList.add('hidden');
        
        // સૌથી નવો ડેટા ઉપર બતાવવા માટે ઉતરતા ક્રમમાં ગોઠવણ
        const sortedDisplay = [...ledger].sort((a, b) => new Date(b.month) - new Date(a.month));
        
        sortedDisplay.forEach((entry) => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-slate-800/30 transition-colors';
            row.innerHTML = `
                <td class="px-6 py-4 font-medium">${new Date(entry.month).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</td>
                <td class="px-6 py-4 text-slate-300">${formatCurrency(entry.income)}</td>
                <td class="px-6 py-4 text-amber-400 font-semibold">${formatCurrency(entry.invested)}</td>
                <td class="px-6 py-4 text-right">
                    <button onclick="deleteEntry('${entry.id}')" class="text-slate-500 hover:text-red-400 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </td>
            `;
            ledgerBody.appendChild(row);
        });
    }
}

window.deleteEntry = function(id) {
    if (confirm('શું આપ ખરેખર આ રેકોર્ડ ડિલીટ કરવા માંગો છો?')) {
        ledger = ledger.filter(entry => entry.id !== id);
        saveData();
        renderLedger();
        updateDashboard();
    }
}

entryForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const income = parseFloat(document.getElementById('input-income').value);
    const invested = parseFloat(document.getElementById('input-invested').value);

    // 1. Data Validation: Invested રકમ Income કરતાં વધુ ન હોવી જોઈએ
    if (invested > income) {
        alert("ભૂલ: રોકાણની રકમ (Invested) તમારી કુલ આવક (Income) કરતાં વધુ ન હોઈ શકે!");
        return; // કોડ અહી જ અટકી જશે, ડેટા સેવ નહીં થાય
    }
    
    const newEntry = {
        id: Date.now().toString(),
        month: document.getElementById('input-date').value,
        income: income,
        invested: invested
    };

    ledger.push(newEntry);
    saveData();
    renderLedger();
    updateDashboard();
    entryForm.reset();
});

// Initial Load (પેજ રિફ્રેશ થાય ત્યારે ડેટા પાછો લાવવા)
renderLedger();
updateDashboard();
