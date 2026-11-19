let chartInstance = null;
let currentLang = 'ar';
let lastGraphData = null;

const i18n = {
    ar: {
        pageTitle: "حاسبة طريقة نيوتن-رافسون",
        appTitle: "طريقة نيوتن-رافسون",
        langLabel: "EN",
        settingsTitle: "إعدادات المسألة",
        lblFx: "دالة المعادلة f(x):",
        phFx: "مثال: x^3 - x - 2",
        lblDfx: "المشتقة f'(x) (اختياري):",
        phDfx: "تلقائي",
        lblX0: "التخمين الأولي (x₀):",
        phX0: "مثال: 0",
        btnCalc: "احسب وحلل النتائج",
        lblRootFound: "الجذر التقريبي المحسوب:",
        lblChartTitle: "الرسم البياني للدالة والمماس",
        lblTangentStep: "مماس الخطوة:",
        lblTableTitle: "جدول خطوات التكرار",
        alertEmptyFx: "يرجى إدخال دالة المعادلة f(x).",
        alertUndefined: "القيمة غير معرفة أو غير منتهية.",
        alertZeroDeriv: "المشتقة تساوي صفراً، تعذر إكمال الطريقة.",
        alertInvalidFunc: "تأكد من صحة كتابة الدالة الرياضية.",
        stepLabelPrefix: "خطوة",
        legendFunc: "f(x)",
        legendTangent: "خط المماس",
        legendTangentPt: "نقطة التماس",
        legendRoot: "تقدير الجذر"
    },
    en: {
        pageTitle: "Newton-Raphson Method Calculator",
        appTitle: "Newton-Raphson Method",
        langLabel: "عربي",
        settingsTitle: "Problem Settings",
        lblFx: "Equation Function f(x):",
        phFx: "e.g., x^3 - x - 2",
        lblDfx: "Derivative f'(x) (Optional):",
        phDfx: "Auto",
        lblX0: "Initial Guess (x₀):",
        phX0: "e.g., 0",
        btnCalc: "Calculate & Analyze",
        lblRootFound: "Calculated Approximate Root:",
        lblChartTitle: "Function & Tangent Line Plot",
        lblTangentStep: "Tangent step:",
        lblTableTitle: "Iteration Steps Table",
        alertEmptyFx: "Please enter the function f(x).",
        alertUndefined: "Value is undefined or infinite.",
        alertZeroDeriv: "Derivative is zero; unable to continue.",
        alertInvalidFunc: "Please check the math function syntax.",
        stepLabelPrefix: "Step",
        legendFunc: "f(x)",
        legendTangent: "Tangent Line",
        legendTangentPt: "Tangent Point",
        legendRoot: "Root Estimate"
    }
};

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function setPlaceholder(id, text) {
    const el = document.getElementById(id);
    if (el) el.placeholder = text;
}

function toggleTheme() {
    const html = document.documentElement;
    const icon = document.getElementById('theme-icon');
    if (html.classList.contains('dark')) {
        html.classList.remove('dark');
        if (icon) icon.className = "fa-solid fa-sun text-primary";
    } else {
        html.classList.add('dark');
        if (icon) icon.className = "fa-solid fa-moon text-primary";
    }
    redrawCurrentChart();
}

function toggleLanguage() {
    currentLang = currentLang === 'ar' ? 'en' : 'ar';
    const t = i18n[currentLang];
    const html = document.documentElement;

    html.lang = currentLang;
    html.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
    document.title = t.pageTitle;

    setText('app-title', t.appTitle);
    setText('lang-label', t.langLabel);
    setText('settings-title-text', t.settingsTitle);
    setText('lbl-fx', t.lblFx);
    setText('lbl-dfx', t.lblDfx);
    setText('lbl-x0', t.lblX0);

    setPlaceholder('fx-input', t.phFx);
    setPlaceholder('dfx-input', t.phDfx);
    setPlaceholder('x0-input', t.phX0);

    setText('btn-calc-text', t.btnCalc);
    setText('lbl-root-found', t.lblRootFound);
    setText('chart-title-text', t.lblChartTitle);
    setText('lbl-tangent-step', t.lblTangentStep);
    setText('table-title-text', t.lblTableTitle);

    if (lastGraphData) {
        populateStepSelector(lastGraphData.iterations);
        redrawCurrentChart();
    }
}

function formatNum(num, decimals = 5) {
    const fixed = Number(num.toFixed(decimals));
    return (fixed === 0 ? 0 : fixed).toFixed(decimals);
}

// تخمين أولي تلقائي في الخلفية إذا ترك المستخدم خانة x0 فارغة
function getAutoGuess(f) {
    for (let x = -10; x <= 10; x += 0.5) {
        try {
            const y1 = f.evaluate({ x });
            const y2 = f.evaluate({ x: x + 0.5 });
            if (isFinite(y1) && isFinite(y2) && y1 * y2 <= 0) {
                return x + 0.25;
            }
        } catch (e) {}
    }
    return 1;
}

function calculateNewton() {
    const t = i18n[currentLang];
    const fxStr = document.getElementById('fx-input').value.trim();
    const dfxStrInput = document.getElementById('dfx-input').value.trim();
    const x0Raw = document.getElementById('x0-input').value.trim();

    if (!fxStr) {
        alert(t.alertEmptyFx);
        return;
    }

    try {
        const f = math.compile(fxStr);
        let df;
        if (dfxStrInput !== '') {
            df = math.compile(dfxStrInput);
        } else {
            const node = math.parse(fxStr);
            const derivNode = math.derivative(node, 'x');
            df = derivNode.compile();
        }

        const x0 = x0Raw === '' ? getAutoGuess(f) : parseFloat(x0Raw);
        if (isNaN(x0)) {
            alert(t.alertInvalidFunc);
            return;
        }

        let iterations = [];
        let xi = x0;
        const safetyLimit = 1000;
        const decimals = 5;

        for (let i = 0; i < safetyLimit; i++) {
            const fxi = f.evaluate({ x: xi });
            const dfxi = df.evaluate({ x: xi });

            if (!isFinite(fxi) || !isFinite(dfxi)) {
                alert(t.alertUndefined);
                break;
            }

            if (dfxi === 0) {
                alert(t.alertZeroDeriv);
                break;
            }

            const xNext = xi - (fxi / dfxi);

            iterations.push({
                i: i,
                xi: xi,
                fxi: fxi,
                dfxi: dfxi,
                xNext: xNext
            });

            if (formatNum(xNext, decimals) === formatNum(xi, decimals)) {
                iterations.push({
                    i: i + 1,
                    xi: xNext,
                    fxi: f.evaluate({ x: xNext }),
                    dfxi: df.evaluate({ x: xNext }),
                    xNext: xNext
                });
                xi = xNext;
                break;
            }

            xi = xNext;
        }

        if (iterations.length === 0) return;

        document.getElementById('result-summary').classList.remove('hidden');
        document.getElementById('root-output').innerText = formatNum(xi, 6);

        const tbody = document.getElementById('table-body');
        tbody.innerHTML = '';

        iterations.forEach(row => {
            tbody.innerHTML += `
                <tr class="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                    <td class="py-3 px-4 font-semibold">${row.i}</td>
                    <td class="py-3 px-4">${formatNum(row.xi, decimals)}</td>
                    <td class="py-3 px-4">${formatNum(row.fxi, decimals)}</td>
                    <td class="py-3 px-4">${formatNum(row.dfxi, decimals)}</td>
                </tr>
            `;
        });

        lastGraphData = { f, xStart: x0, xFinal: xi, iterations };
        populateStepSelector(iterations);
        plotGraph(f, x0, xi, iterations, 0);

    } catch (err) {
        console.error(err);
        alert(t.alertInvalidFunc);
    }
}

function populateStepSelector(iterations) {
    const t = i18n[currentLang];
    const box = document.getElementById('tangent-step-box');
    const select = document.getElementById('tangent-step-select');
    if (!box || !select) return;

    const prevVal = select.value || '0';
    select.innerHTML = '';
    iterations.forEach((row) => {
        const opt = document.createElement('option');
        opt.value = row.i;
        opt.textContent = `${t.stepLabelPrefix} ${row.i} (x = ${formatNum(row.xi, 3)})`;
        select.appendChild(opt);
    });

    select.value = iterations.some(r => String(r.i) === prevVal) ? prevVal : '0';
    box.classList.remove('hidden');
    box.classList.add('flex');
}

function redrawCurrentChart() {
    if (!lastGraphData) return;
    const select = document.getElementById('tangent-step-select');
    const stepIdx = parseInt((select && select.value) || '0', 10);
    plotGraph(
        lastGraphData.f,
        lastGraphData.xStart,
        lastGraphData.xFinal,
        lastGraphData.iterations,
        stepIdx
    );
}

function plotGraph(f, xStart, xFinal, iterations = [], activeStep = 0) {
    const t = i18n[currentLang];
    const canvas = document.getElementById('functionChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const currentRow = iterations[activeStep] || iterations[0];

    let minX = Math.min(xStart, xFinal, currentRow ? currentRow.xi : xStart) - 2;
    let maxX = Math.max(xStart, xFinal, currentRow ? currentRow.xi : xFinal) + 2;
    let step = (maxX - minX) / 120;

    let funcPoints = [];
    let tangentPoints = [];

    for (let x = minX; x <= maxX; x += step) {
        try {
            let y = f.evaluate({ x: x });
            if (isFinite(y)) {
                funcPoints.push({ x: x, y: y });
            }
        } catch (e) {}

        if (currentRow && isFinite(currentRow.fxi) && isFinite(currentRow.dfxi)) {
            const yTan = currentRow.fxi + currentRow.dfxi * (x - currentRow.xi);
            if (isFinite(yTan)) {
                tangentPoints.push({ x: x, y: yTan });
            }
        }
    }

    if (chartInstance) {
        chartInstance.destroy();
    }

    const isDark = document.documentElement.classList.contains('dark');
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
    const textColor = isDark ? '#9ca3af' : '#4b5563';

    const datasets = [
        {
            label: t.legendFunc,
            data: funcPoints,
            showLine: true,
            borderColor: '#0984e3',
            backgroundColor: 'transparent',
            borderWidth: 3,
            pointRadius: 0
        }
    ];

    if (tangentPoints.length > 0) {
        datasets.push({
            label: `${t.legendTangent} (i=${currentRow.i})`,
            data: tangentPoints,
            showLine: true,
            borderColor: '#f59e0b',
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [6, 6],
            pointRadius: 0
        });

        datasets.push({
            label: t.legendTangentPt,
            data: [{ x: currentRow.xi, y: currentRow.fxi }],
            backgroundColor: '#f59e0b',
            borderColor: '#ffffff',
            borderWidth: 2,
            pointRadius: 6,
            pointHoverRadius: 8
        });
    }

    datasets.push({
        label: t.legendRoot,
        data: [{ x: xFinal, y: 0 }],
        backgroundColor: '#00f2fe',
        borderColor: '#ffffff',
        pointRadius: 6,
        pointHoverRadius: 8
    });

    chartInstance = new Chart(ctx, {
        type: 'scatter',
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    min: minX,
                    max: maxX,
                    grid: { color: gridColor },
                    ticks: { color: textColor }
                },
                y: {
                    grid: { color: gridColor },
                    ticks: { color: textColor }
                }
            },
            plugins: {
                legend: {
                    labels: { color: textColor }
                }
            }
        }
    });
}