// 1. ટાર્ગેટ અને વળતરના સેટિંગ્સ
const TARGET_CORPUS = 20000000; // ₹2.0 કરોડ
const INFLATION_RATE = 0.065; // 6.5% મોંઘવારી

// Nifty 50 Direct Plan (કોઈ કમિશન નહિ): 12% - 6.5% = 5.5% વાસ્તવિક વળતર
const DIRECT_REAL_RATE = 0.055; 
const MONTHLY_RATE_DIRECT = DIRECT_REAL_RATE / 12;

// Regular Plan (બેંક/એજન્ટ મારફતે 1.5% કમિશન કાપીને): 10.5% - 6.5% = 4.0% વાસ્તવિક વળતર
const REGULAR_REAL_RATE = 0.040;
const MONTHLY_RATE_REGULAR = REGULAR_REAL_RATE / 12;

let ledger = JSON.parse(localStorage.getItem('artha_lakshya_ledger')) || [];

// DOM Elements
const entryForm = document.getElementById('entry-form');
const ledgerBody = document.getElementById('ledger-body');
const targetDateEl = document.getElementById('target-date');
const rollingAvgEl = document.getElementById('rolling-avg');
const totalInvestedEl = document.getElementById('total-invested');
const emptyStateEl = document.getElementById('empty-state');

function saveData() {
    localStorage.setItem('artha_lakshya_ledger', JSON.stringify(ledger));
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount);
}

// ગણતરી માટેનું ફંક્શન (TVM Formula)
function calculateMonthsRemaining(fv, pv, pmt, monthlyRate) {
    const numerator = Math.log((fv * monthlyRate + pmt) / (pv * monthlyRate + pmt));
    const denominator = Math.log(1 + monthlyRate);
    if (numerator <= 0 || isNaN(numerator) || pv >= fv) return 0;
    return Math.ceil(numerator / denominator);
}

function updateDashboard() {
    ledger.sort((a, b) => new Date(a.month) - new Date(b.month));

    const totalInvested = ledger.reduce((sum, entry) => sum + parseFloat(entry.invested), 0);
    totalInvestedEl.textContent = formatCurrency(totalInvested);

    const lastMonths = ledger.slice(-6);
    const pmt = lastMonths.length > 0 
        ? lastMonths.reduce((sum, entry) => sum + parseFloat(entry.invested), 0) / lastMonths.length 
        : 0;
        
    rollingAvgEl.textContent = formatCurrency(pmt);

    // ડાયનેમિક મેસેજ બતાવવા માટે નવું Element બનાવવું (જો ન હોય તો)
    let insightMsgEl = document.getElementById('insight-msg');
    if (!insightMsgEl) {
        insightMsgEl = document.createElement('div');
        insightMsgEl.id = 'insight-msg';
        insightMsgEl.className = 'text-amber-400 text-sm mt-6 font-semibold bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 leading-relaxed';
        targetDateEl.parentElement.appendChild(insightMsgEl);
    }

    if (pmt <= 0) {
        targetDateEl.textContent = "--";
        insightMsgEl.style.display = 'none';
        return;
    } else {
        insightMsgEl.style.display = 'block';
    }

    const pv = totalInvested; 
    const fv = TARGET_CORPUS;

    // Direct vs Regular ની સરખામણી
    const monthsDirect = calculateMonthsRemaining(fv, pv, pmt, MONTHLY_RATE_DIRECT);
    const monthsRegular = calculateMonthsRemaining(fv, pv, pmt, MONTHLY_RATE_REGULAR);

    if (monthsDirect === 0) {
        targetDateEl.textContent = "GOAL REACHED!";
        targetDateEl.classList.add('text-green-400');
        insightMsgEl.style.display = 'none';
        return;
    }

    // Direct Plan ની તારીખ સેટ કરવી
    const targetDate = new Date();
    targetDate.setMonth(targetDate.getMonth() + monthsDirect);
    targetDateEl.textContent = targetDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }).toUpperCase();
    targetDateEl.classList.remove('text-green-400');

    // કમિશન બચાવવાથી કેટલા વર્ષનો ફાયદો થયો તે બતાવવું
    if (monthsRegular > monthsDirect) {
        const monthsSaved = monthsRegular - monthsDirect;
        const yearsSaved = (monthsSaved / 12).toFixed(1);
        insightMsgEl.innerHTML = `🚀 <b>Nifty 50 (Direct Plan)</b> ની તાકાત: <br> બેંકના કમિશન (Regular Plan) થી બચીને આપ <b>${yearsSaved} વર્ષ વહેલા</b> આર્થિક સ્વતંત્રતા મેળવી શકશો!`;
    } else {
        insightMsgEl.style.display = 'none';
    }
}

function renderLedger() {
    ledgerBody.innerHTML = '';
    
    if (ledger.length === 0) {
        emptyStateEl.classList.remove('hidden');
    } else {
        emptyStateEl.classList.add('hidden');
        
        const sortedDisplay = [...ledger].sort((a, b) => new Date(b.month) - new Date(a.month));
        
        sortedDisplay.forEach((entry) => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-slate-800/40 transition-colors';
            row.innerHTML = `
                <td class="px-8 py-5 font-medium text-white">${new Date(entry.month).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</td>
                <td class="px-8 py-5 text-slate-300 font-numbers">${formatCurrency(entry.income)}</td>
                <td class="px-8 py-5 text-amber-400 font-semibold font-numbers">${formatCurrency(entry.invested)}</td>
                <td class="px-8 py-5 text-right">
                    <button onclick="deleteEntry('${entry.id}')" class="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all">
                        <svg class="w-5 h-5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
    if (confirm('શું આપ આ રેકોર્ડ ડિલીટ કરવા માંગો છો?')) {
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

    if (invested > income) {
        alert("ભૂલ: રોકાણની રકમ (Invested) તમારી કુલ આવક (Income) કરતાં વધુ ન હોઈ શકે!");
        return; 
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

// Initial Load
renderLedger();
updateDashboard();
